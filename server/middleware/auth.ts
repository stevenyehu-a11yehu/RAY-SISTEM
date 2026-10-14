import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
  };
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Ambil token dari cookie atau Bearer authorization header
  const tokenFromCookie = req.cookies?.auth_token;
  const authHeader = req.headers.authorization;
  const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  const token = tokenFromCookie || tokenFromHeader;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Akses ditolak: Anda belum login atau sesi telah berakhir.',
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { id: string; username: string };
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Token otentikasi tidak valid atau telah kedaluwarsa.',
    });
  }
}
