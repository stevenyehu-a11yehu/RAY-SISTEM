import { Router, Response } from 'express';
import { googleService } from '../services/google.js';
import { fonnteService, formatIndonesianPhoneNumber } from '../services/fonnte.js';
import { reminderScheduler, renderReminderTemplate } from '../services/scheduler.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { TestSendSchema } from '../validators.js';

export const remindersRouter = Router();

remindersRouter.use(authMiddleware);

// POST /api/reminders/test-send (Uji coba kirim pesan dari menu Pengaturan)
remindersRouter.post('/test-send', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = TestSendSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: parseResult.error.issues[0]?.message || 'Input tes kirim tidak valid',
      });
    }

    const { phone, message } = parseResult.data;
    const settings = await googleService.getSettings();

    const result = await fonnteService.sendMessage(phone, message, settings.fonnte_token);

    // Catat ke log
    await googleService.logReminder({
      document_id: 'TEST_MANUAL',
      rule_key: 'TEST_KIRIM_PENGATURAN',
      tujuan: formatIndonesianPhoneNumber(phone),
      pesan: message,
      waktu_kirim: new Date().toISOString(),
      status_kirim: result.success ? 'berhasil' : 'gagal',
      respons_fonnte: result.success
        ? `Tes Berhasil (ID: ${result.messageId || 'ok'}, Percobaan: ${result.attempts})`
        : `Tes Gagal: ${result.errorMessage} (Raw: ${result.responseRaw.slice(0, 100)})`,
    });

    if (result.success) {
      return res.json({
        success: true,
        message: `Pesan uji coba berhasil dikirim ke ${formatIndonesianPhoneNumber(phone)}!`,
        data: result,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: `Gagal mengirim WhatsApp via Fonnte: ${result.errorMessage}`,
        raw: result.responseRaw,
      });
    }
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Kesalahan server saat tes kirim: ' + err.message,
    });
  }
});

// POST /api/reminders/:documentId/send-now (Tombol "Kirim sekarang" per dokumen)
remindersRouter.post('/:documentId/send-now', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { documentId } = req.params;
    const { customMessage } = req.body;

    const doc = await googleService.getDocumentById(documentId);
    if (!doc) {
      return res.status(404).json({
        success: false,
        message: 'Dokumen tidak ditemukan.',
      });
    }

    const settings = await googleService.getSettings();
    const rules = await googleService.getReminderRules();

    let messageToSend = customMessage;
    if (!messageToSend || !messageToSend.trim()) {
      // Ambil template dari status dokumen
      const matchingRule = rules.find((r) => r.status === doc.status);
      const defaultTemplate =
        matchingRule?.template ||
        'Halo {vendor}, dokumen {judul} saat ini berstatus {status}. Harap segera ditindaklanjuti. Link berkas: {link}';

      // Hitung hari berjalan
      const created = new Date(doc.dibuat_pada);
      const now = new Date();
      const hariBerjalan = Math.max(
        1,
        Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)) + 1
      );

      messageToSend = renderReminderTemplate(defaultTemplate, doc, hariBerjalan);
    }

    const ruleKey = `MANUAL_SEND_${doc.status.toUpperCase().replace(/\s+/g, '_')}`;
    const dispatchResult = await reminderScheduler.dispatchToRecipients(
      doc,
      ruleKey,
      messageToSend,
      settings
    );

    return res.json({
      success: true,
      message: `Pengingat WhatsApp berhasil dikirim ke ${dispatchResult.successCount} dari ${dispatchResult.targetsSent} nomor tujuan!`,
      data: {
        sent: dispatchResult.successCount,
        total: dispatchResult.targetsSent,
        message: messageToSend,
      },
    });
  } catch (err: any) {
    console.error('Error send now:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengirim pengingat manual: ' + err.message,
    });
  }
});
