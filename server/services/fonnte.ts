import { googleService } from './google.js';
import { config } from '../config.js';

export interface FonnteSendResult {
  success: boolean;
  messageId?: string;
  responseRaw: string;
  errorMessage?: string;
  attempts: number;
}

/**
 * Format nomor telepon Indonesia menjadi standar Fonnte (628xxxx)
 */
export function formatIndonesianPhoneNumber(phone: string): string {
  if (!phone) return '';
  // Hapus semua karakter non-digit
  let cleaned = phone.replace(/\D/g, '');

  // Jika diawali 08..., ubah menjadi 628...
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }

  return cleaned;
}

export class FonnteService {
  /**
   * Mengirim pesan WhatsApp via API Fonnte dengan mekanisme retry hingga 3x
   */
  public async sendMessage(
    targetPhone: string,
    message: string,
    customToken?: string
  ): Promise<FonnteSendResult> {
    const formattedPhone = formatIndonesianPhoneNumber(targetPhone);
    if (!formattedPhone || formattedPhone.length < 9) {
      return {
        success: false,
        responseRaw: '',
        errorMessage: `Format nomor WhatsApp tidak valid: "${targetPhone}" (hasil: "${formattedPhone}")`,
        attempts: 1,
      };
    }

    // Ambil token dari parameter, database settings, atau config fallback
    let token = customToken;
    if (!token) {
      const settings = await googleService.getSettings();
      token = settings.fonnte_token || config.fonnteToken;
    }

    // Jika token masih kosong (mode dev/testing awal)
    if (!token || token.trim() === '') {
      console.warn('⚠️ Token Fonnte belum dikonfigurasi. Simulasi kirim pesan WhatsApp.');
      return {
        success: true,
        messageId: `simulated_msg_${Date.now()}`,
        responseRaw: JSON.stringify({
          status: true,
          detail: 'Mode Simulasi: Token Fonnte belum diisi. Pesan tercatat secara lokal.',
          target: formattedPhone,
        }),
        attempts: 1,
      };
    }

    const maxRetries = 3;
    let attempt = 0;
    let lastError = '';
    let lastResponseText = '';

    while (attempt < maxRetries) {
      attempt++;
      try {
        const formData = new URLSearchParams();
        formData.append('target', formattedPhone);
        formData.append('message', message);
        formData.append('countryCode', '62');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 detik timeout

        const response = await fetch(config.fonnteApiUrl, {
          method: 'POST',
          headers: {
            Authorization: token,
          },
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const responseText = await response.text();
        lastResponseText = responseText;

        let parsed: any = null;
        try {
          parsed = JSON.parse(responseText);
        } catch {
          // Response bukan JSON
        }

        // Fonnte biasanya mengembalikan { status: true, ... }
        if (response.ok && parsed && (parsed.status === true || parsed.status === 'true')) {
          return {
            success: true,
            messageId: parsed.id || (parsed.target && parsed.target[0]) || 'ok',
            responseRaw: responseText,
            attempts: attempt,
          };
        } else {
          const detail = parsed?.reason || parsed?.detail || parsed?.message || responseText;
          lastError = `Fonnte menolak pengiriman (status ${response.status}): ${detail}`;
          console.warn(`[Percobaan ${attempt}/${maxRetries}] Fonnte error:`, lastError);
        }
      } catch (err: any) {
        lastError = err.name === 'AbortError' ? 'Koneksi ke Fonnte timeout (12 detik)' : err.message;
        console.warn(`[Percobaan ${attempt}/${maxRetries}] Gagal menghubungi Fonnte:`, lastError);
      }

      // Jeda sebelum retry berikutnya (1.5 detik * attempt)
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
      }
    }

    return {
      success: false,
      responseRaw: lastResponseText,
      errorMessage: lastError || 'Gagal mengirim pesan setelah 3 kali percobaan.',
      attempts: attempt,
    };
  }
}

export const fonnteService = new FonnteService();
