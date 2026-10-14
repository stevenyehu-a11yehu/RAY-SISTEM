import cron, { ScheduledTask } from 'node-cron';
import { googleService } from './google.js';
import { fonnteService, formatIndonesianPhoneNumber } from './fonnte.js';
import { DocumentRecord, ReminderRuleRecord, AppSettings } from '../types.js';

/**
 * Render template teks dengan substitusi placeholder dinamis
 */
export function renderReminderTemplate(
  template: string,
  doc: DocumentRecord,
  hariBerjalan: number
): string {
  let result = template;
  result = result.replace(/{vendor}/g, doc.vendor || '-');
  result = result.replace(/{judul}/g, doc.judul || '-');
  result = result.replace(/{status}/g, doc.status || '-');
  result = result.replace(/{deadline}/g, doc.deadline || 'Tidak ada');
  result = result.replace(/{link}/g, doc.drive_url || '-');
  result = result.replace(/{hari_berjalan}/g, String(hariBerjalan));
  return result;
}

/**
 * Menghitung selisih hari antara dua tanggal (target - now)
 */
function getDaysDifference(deadlineStr: string, now: Date): number | null {
  if (!deadlineStr) return null;
  const parts = deadlineStr.split('-');
  if (parts.length !== 3) return null;
  const deadlineDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffTime = deadlineDate.getTime() - nowDate.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Menghitung hari berjalan sejak dokumen dibuat
 */
function getDaysRunning(createdIso: string, now: Date): number {
  try {
    const created = new Date(createdIso);
    const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const createdDate = new Date(created.getFullYear(), created.getMonth(), created.getDate());
    const diff = Math.floor((nowDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, diff + 1);
  } catch {
    return 1;
  }
}

export class ReminderScheduler {
  private cronJob: ScheduledTask | null = null;
  private isRunningCheck: boolean = false;

  public start() {
    console.log('⏰ Inisialisasi scheduler pengingat WhatsApp (node-cron)...');

    // Berjalan setiap menit
    this.cronJob = cron.schedule('* * * * *', async () => {
      if (this.isRunningCheck) {
        console.log('⏳ Iterasi scheduler sebelumnya masih berjalan, lewati menit ini.');
        return;
      }
      this.isRunningCheck = true;
      try {
        await this.runReminderTick();
      } catch (err: any) {
        console.error('❌ Error saat eksekusi scheduler pengingat:', err.message);
      } finally {
        this.isRunningCheck = false;
      }
    });

    console.log('✅ Scheduler aktif: pemeriksaan otomatis berjalan setiap menit.');
  }

  public stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      console.log('🛑 Scheduler dihentikan.');
    }
  }

  /**
   * Inti logika pemeriksaan pengingat per menit
   */
  public async runReminderTick() {
    const settings = await googleService.getSettings();
    const rules = await googleService.getReminderRules();
    const documents = await googleService.getDocuments();

    // Dapatkan waktu saat ini sesuai konfigurasi timezone
    const tz = settings.timezone || 'Asia/Jakarta';
    const nowInTzString = new Date().toLocaleString('en-US', { timeZone: tz });
    const now = new Date(nowInTzString);

    const currentHour = String(now.getHours()).padStart(2, '0');
    const currentMinute = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHour}:${currentMinute}`;
    const currentDayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); // 1=Senin..7=Minggu
    const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Filter dokumen aktif (bukan Selesai dan tidak dihapus)
    const activeDocuments = documents.filter((d) => d.status !== 'Selesai' && !d.dihapus);

    // 1. EVALUASI ATURAN STATUS (On Going, Perlu Direvisi, Perlu Ditandatangani)
    for (const rule of rules) {
      if (!rule.aktif) continue;
      if (rule.jam !== currentTimeStr) continue;

      // Cek apakah hari ini masuk ke daftar hari kirim
      const allowedDays = rule.hari ? rule.hari.split(',').map((h) => parseInt(h.trim(), 10)) : [1, 2, 3, 4, 5];
      if (!allowedDays.includes(currentDayOfWeek)) continue;

      // Ambil dokumen dengan status yang cocok
      const matchingDocs = activeDocuments.filter((d) => d.status === rule.status);

      for (const doc of matchingDocs) {
        const hariBerjalan = getDaysRunning(doc.dibuat_pada, now);

        // Cek interval hari (misal interval_hari = 2, kirim jika hari_berjalan % 2 === 1 atau interval terpenuhi)
        if (rule.interval_hari > 1) {
          if (hariBerjalan % rule.interval_hari !== 1) {
            continue;
          }
        }

        const ruleKey = `STATUS_${rule.status.toUpperCase().replace(/\s+/g, '_')}`;

        // Cek IDEMPOTENCY: apakah sudah terkirim hari ini?
        const alreadySent = await googleService.hasLogForToday(doc.id, ruleKey, todayDateStr);
        if (alreadySent) {
          continue;
        }

        const renderedMessage = renderReminderTemplate(rule.template, doc, hariBerjalan);
        await this.dispatchToRecipients(doc, ruleKey, renderedMessage, settings);
      }
    }

    // 2. EVALUASI ATURAN DEADLINE (H-7, H-3, H-1, Hari-H)
    for (const doc of activeDocuments) {
      if (!doc.deadline) continue;
      const daysDiff = getDaysDifference(doc.deadline, now);
      if (daysDiff === null) continue;

      // Evaluasi hanya pada jam default pagi (contoh: 08:30)
      if (currentTimeStr !== '08:30') continue;

      let deadlineKey: string | null = null;
      let template: string | null = null;

      if (daysDiff === 7 && settings.deadline_h7_active) {
        deadlineKey = 'DEADLINE_H7';
        template = settings.deadline_h7_template;
      } else if (daysDiff === 3 && settings.deadline_h3_active) {
        deadlineKey = 'DEADLINE_H3';
        template = settings.deadline_h3_template;
      } else if (daysDiff === 1 && settings.deadline_h1_active) {
        deadlineKey = 'DEADLINE_H1';
        template = settings.deadline_h1_template;
      } else if (daysDiff === 0 && settings.deadline_h0_active) {
        deadlineKey = 'DEADLINE_H0';
        template = settings.deadline_h0_template;
      }

      if (deadlineKey && template) {
        const alreadySent = await googleService.hasLogForToday(doc.id, deadlineKey, todayDateStr);
        if (!alreadySent) {
          const hariBerjalan = getDaysRunning(doc.dibuat_pada, now);
          const renderedMessage = renderReminderTemplate(template, doc, hariBerjalan);
          await this.dispatchToRecipients(doc, deadlineKey, renderedMessage, settings);
        }
      }
    }
  }

  /**
   * Mengirim pesan ke penerima yang dikonfigurasi (Saya saja / Vendor saja / Keduanya)
   */
  public async dispatchToRecipients(
    doc: DocumentRecord,
    ruleKey: string,
    message: string,
    settings: AppSettings
  ): Promise<{ targetsSent: number; successCount: number }> {
    const recipients: { type: 'self' | 'vendor'; phone: string }[] = [];

    const targetMode = settings.recipient_target || 'both';

    if (targetMode === 'self' || targetMode === 'both') {
      const selfPhone = formatIndonesianPhoneNumber(settings.default_wa_number);
      if (selfPhone) {
        recipients.push({ type: 'self', phone: selfPhone });
      }
    }

    if (targetMode === 'vendor' || targetMode === 'both') {
      const vendorPhone = formatIndonesianPhoneNumber(doc.wa_vendor);
      if (vendorPhone) {
        // Jangan duplikat jika nomor vendor sama dengan nomor saya
        if (!recipients.some((r) => r.phone === vendorPhone)) {
          recipients.push({ type: 'vendor', phone: vendorPhone });
        }
      }
    }

    let successCount = 0;

    for (const rec of recipients) {
      console.log(`📤 Mengirim pengingat [${ruleKey}] untuk dokumen "${doc.judul}" ke ${rec.phone} (${rec.type})...`);
      const result = await fonnteService.sendMessage(rec.phone, message, settings.fonnte_token);

      await googleService.logReminder({
        document_id: doc.id,
        rule_key: ruleKey,
        tujuan: rec.phone,
        pesan: message,
        waktu_kirim: new Date().toISOString(),
        status_kirim: result.success ? 'berhasil' : 'gagal',
        respons_fonnte: result.success
          ? `Terkirim (ID: ${result.messageId || 'ok'}, Percobaan: ${result.attempts})`
          : `Gagal: ${result.errorMessage || 'Unknown'} (Raw: ${result.responseRaw.slice(0, 100)})`,
      });

      if (result.success) {
        successCount++;
      }
    }

    return { targetsSent: recipients.length, successCount };
  }
}

export const reminderScheduler = new ReminderScheduler();
