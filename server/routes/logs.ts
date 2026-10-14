import { Router, Response } from 'express';
import { googleService } from '../services/google.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

export const logsRouter = Router();

logsRouter.use(authMiddleware);

// GET /api/logs (Riwayat log pengiriman notifikasi WhatsApp)
logsRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, q, limit = '100' } = req.query as Record<string, string>;
    const limitNum = Math.min(300, Math.max(10, parseInt(limit, 10) || 100));

    let logs = await googleService.getReminderLogs(limitNum);

    if (status && status !== 'Semua') {
      logs = logs.filter((l) => l.status_kirim.toLowerCase() === status.toLowerCase());
    }

    if (q && q.trim()) {
      const qLower = q.toLowerCase().trim();
      logs = logs.filter(
        (l) =>
          l.tujuan.includes(qLower) ||
          l.pesan.toLowerCase().includes(qLower) ||
          l.rule_key.toLowerCase().includes(qLower) ||
          l.respons_fonnte.toLowerCase().includes(qLower)
      );
    }

    return res.json({
      success: true,
      data: logs,
      total: logs.length,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat log pengiriman: ' + err.message,
    });
  }
});
