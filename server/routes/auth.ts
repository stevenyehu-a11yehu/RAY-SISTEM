import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { googleService } from '../services/google.js';
import { config } from '../config.js';
import { LoginSchema } from '../validators.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

export const authRouter = Router();

// Rate limiting in-memory sederhana untuk login (maksimal 10 percobaan per 5 menit)
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 5 * 60 * 1000 });
    return true;
  }
  if (record.count >= 10) {
    return false;
  }
  record.count++;
  return true;
}

// POST /api/auth/login
authRouter.post('/login', async (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({
      success: false,
      message: 'Terlalu banyak percobaan login. Silakan coba lagi dalam 5 menit.',
    });
  }

  const parseResult = LoginSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      message: parseResult.error.issues[0]?.message || 'Input login tidak valid',
    });
  }

  const { username, password } = parseResult.data;

  try {
    const user = await googleService.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Username atau password tidak cocok.',
      });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Username atau password tidak cocok.',
      });
    }

    // Buat JWT Token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    // Set cookie httpOnly
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 hari
    });

    return res.json({
      success: true,
      message: 'Login berhasil.',
      token,
      user: {
        id: user.id,
        username: user.username,
      },
    });
  } catch (err: any) {
    console.error('Error login:', err);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan sistem saat verifikasi akun.',
    });
  }
});

// POST /api/auth/logout
authRouter.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('auth_token');
  return res.json({
    success: true,
    message: 'Logout berhasil.',
  });
});

// GET /api/auth/me
authRouter.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const connection = googleService.getConnectionStatus();
  return res.json({
    success: true,
    user: req.user,
    googleConnection: connection,
  });
});

// POST /api/auth/seed-admin (utility untuk bootstrap cepat)
authRouter.post('/seed-admin', async (req: Request, res: Response) => {
  try {
    const existing = await googleService.getUserByUsername(config.adminInitialUsername);
    if (existing) {
      return res.json({
        success: true,
        message: 'Akun admin awal sudah ada.',
        username: existing.username,
      });
    }

    const hash = bcrypt.hashSync(config.adminInitialPassword, 10);
    const created = await googleService.createUser(config.adminInitialUsername, hash);

    return res.json({
      success: true,
      message: 'Akun admin awal berhasil dibuat.',
      username: created.username,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});
