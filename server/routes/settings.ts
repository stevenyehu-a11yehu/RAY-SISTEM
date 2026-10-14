import { Router, Response } from 'express';
import { googleService } from '../services/google.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { UpdateSettingsSchema, UpdateReminderRulesSchema } from '../validators.js';

export const settingsRouter = Router();

settingsRouter.use(authMiddleware);

// Fungsi mask token untuk keamanan di UI
function maskToken(token: string): string {
  if (!token || token.length < 8) return '********';
  return `${token.slice(0, 4)}••••••••${token.slice(-4)}`;
}

// GET /api/settings
settingsRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const settings = await googleService.getSettings();
    const rules = await googleService.getReminderRules();
    const connection = googleService.getConnectionStatus();

    // Sembunyikan token utuh demi keamanan
    const maskedSettings = {
      ...settings,
      fonnte_token_masked: maskToken(settings.fonnte_token),
      has_fonnte_token: Boolean(settings.fonnte_token && settings.fonnte_token.trim().length > 0),
      fonnte_token: undefined, // Jangan kirim token mentah
    };

    return res.json({
      success: true,
      data: {
        settings: maskedSettings,
        reminderRules: rules,
        googleConnection: connection,
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat pengaturan: ' + err.message,
    });
  }
});

// PUT /api/settings (Simpan perubahan pengaturan & aturan pengingat)
settingsRouter.put('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { settings: incomingSettings, reminderRules: incomingRules } = req.body;

    // 1. Simpan Settings jika ada
    if (incomingSettings) {
      const parsed = UpdateSettingsSchema.safeParse(incomingSettings);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: parsed.error.issues[0]?.message || 'Format pengaturan tidak valid',
        });
      }

      const payload = { ...parsed.data };
      // Abaikan jika token dikirim masih berformat masked atau kosong
      if (payload.fonnte_token && payload.fonnte_token.includes('••••')) {
        delete payload.fonnte_token;
      }

      await googleService.updateSettings(payload as any);
    }

    // 2. Simpan ReminderRules jika ada
    if (incomingRules) {
      const parsedRules = UpdateReminderRulesSchema.safeParse(incomingRules);
      if (!parsedRules.success) {
        return res.status(400).json({
          success: false,
          message: parsedRules.error.issues[0]?.message || 'Format aturan pengingat tidak valid',
        });
      }

      await googleService.updateReminderRules(parsedRules.data);
    }

    const updatedSettings = await googleService.getSettings();
    const updatedRules = await googleService.getReminderRules();

    return res.json({
      success: true,
      message: 'Pengaturan dan jadwal pengingat berhasil disimpan dan langsung aktif!',
      data: {
        settings: {
          ...updatedSettings,
          fonnte_token_masked: maskToken(updatedSettings.fonnte_token),
          has_fonnte_token: Boolean(updatedSettings.fonnte_token),
          fonnte_token: undefined,
        },
        reminderRules: updatedRules,
      },
    });
  } catch (err: any) {
    console.error('Error saving settings:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal menyimpan pengaturan: ' + err.message,
    });
  }
});
