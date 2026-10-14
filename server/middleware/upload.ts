import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import path from 'path';
import { googleService } from '../services/google.js';

const storage = multer.memoryStorage();

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.jpg', '.jpeg', '.png'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'image/jpeg',
  'image/png',
  'image/jpg',
];

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype.toLowerCase();

  const isExtAllowed = ALLOWED_EXTENSIONS.includes(ext);
  const isMimeAllowed = ALLOWED_MIME_TYPES.includes(mime);

  if (isExtAllowed && isMimeAllowed) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Format berkas tidak didukung (${ext || mime}). Hanya diperbolehkan: PDF, DOCX, XLSX, JPG, PNG.`
      )
    );
  }
};

// Base multer instance dengan batas maksimal aman 50 MB di level memori
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

/**
 * Middleware wrapper untuk memvalidasi batas ukuran file dinamis sesuai Settings
 */
export function dynamicUploadMiddleware(fieldName: string = 'file') {
  const single = upload.single(fieldName);

  return async (req: Request, res: Response, next: NextFunction) => {
    single(req, res, async (err: any) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'Ukuran berkas melebihi batas sistem maksimum 50 MB.',
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message || 'Gagal memproses berkas yang diunggah.',
        });
      }

      // Validasi dinamis sesuai batas ukuran di database Settings (default 10 MB)
      if (req.file) {
        try {
          const settings = await googleService.getSettings();
          const maxAllowedMb = settings.max_file_size_mb || 10;
          const maxAllowedBytes = maxAllowedMb * 1024 * 1024;

          if (req.file.size > maxAllowedBytes) {
            return res.status(400).json({
              success: false,
              message: `Ukuran berkas (${(req.file.size / (1024 * 1024)).toFixed(2)} MB) melebihi batas yang dikonfigurasi (${maxAllowedMb} MB). Ubah batas ukuran pada menu Pengaturan jika diperlukan.`,
            });
          }
        } catch {
          // Abaikan jika error membaca settings, lanjutkan
        }
      }

      next();
    });
  };
}
