import { Router, Response } from 'express';
import { googleService } from '../services/google.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { dynamicUploadMiddleware } from '../middleware/upload.js';
import {
  CreateDocumentSchema,
  UpdateDocumentSchema,
  ChangeStatusSchema,
  UpdateVersionSchema,
} from '../validators.js';

export const documentsRouter = Router();

// Proteksi semua rute dokumen dengan auth middleware
documentsRouter.use(authMiddleware);

// GET /api/documents (daftar dokumen, pencarian, filter, paginasi, KPI counts)
documentsRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      q,
      status,
      vendor,
      sort = 'terbaru',
      page = '1',
      limit = '10',
    } = req.query as Record<string, string>;

    const allDocs = await googleService.getDocuments();

    // Hitung KPI / ringkasan statistik sebelum filter pencarian
    const kpi = {
      total: allDocs.length,
      onGoing: allDocs.filter((d) => d.status === 'On Going').length,
      perluDirevisi: allDocs.filter((d) => d.status === 'Perlu Direvisi').length,
      perluDitandatangani: allDocs.filter((d) => d.status === 'Perlu Ditandatangani').length,
      selesai: allDocs.filter((d) => d.status === 'Selesai').length,
      mendekatiDeadline: 0,
      melewatiDeadline: 0,
    };

    const todayStr = new Date().toISOString().split('T')[0];
    const nowDate = new Date(todayStr);

    // Hitung dokumen mendekati/lewat deadline
    allDocs.forEach((d) => {
      if (d.status !== 'Selesai' && d.deadline) {
        const dDate = new Date(d.deadline);
        const diffDays = Math.round((dDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
          kpi.melewatiDeadline++;
        } else if (diffDays <= 3) {
          kpi.mendekatiDeadline++;
        }
      }
    });

    // Kumpulkan daftar vendor unik untuk dropdown filter
    const uniqueVendors = Array.from(new Set(allDocs.map((d) => d.vendor).filter(Boolean))).sort();

    // Terapkan filter
    let filtered = [...allDocs];

    if (q && q.trim()) {
      const queryLower = q.toLowerCase().trim();
      filtered = filtered.filter(
        (d) =>
          d.vendor.toLowerCase().includes(queryLower) ||
          d.judul.toLowerCase().includes(queryLower) ||
          d.catatan.toLowerCase().includes(queryLower)
      );
    }

    if (status && status !== 'Semua') {
      filtered = filtered.filter((d) => d.status === status);
    }

    if (vendor && vendor !== 'Semua') {
      filtered = filtered.filter((d) => d.vendor === vendor);
    }

    // Terapkan pengurutan (Sorting)
    filtered.sort((a, b) => {
      if (sort === 'terlama') {
        return new Date(a.dibuat_pada).getTime() - new Date(b.dibuat_pada).getTime();
      }
      if (sort === 'deadline_asc') {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return a.deadline.localeCompare(b.deadline);
      }
      if (sort === 'deadline_desc') {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return b.deadline.localeCompare(a.deadline);
      }
      if (sort === 'vendor_asc') {
        return a.vendor.localeCompare(b.vendor);
      }
      // default: terbaru
      return new Date(b.dibuat_pada).getTime() - new Date(a.dibuat_pada).getTime();
    });

    // Terapkan paginasi
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / limitNum) || 1;
    const paginatedItems = filtered.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    return res.json({
      success: true,
      data: paginatedItems,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalItems,
        totalPages,
      },
      kpi,
      vendors: uniqueVendors,
    });
  } catch (err: any) {
    console.error('Error fetching documents list:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat daftar dokumen: ' + err.message,
    });
  }
});

// POST /api/documents (Unggah formulir baru & simpan ke Google Drive + Sheets)
documentsRouter.post(
  '/',
  dynamicUploadMiddleware('file'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Berkas formulir wajib dilampirkan (PDF, DOCX, XLSX, JPG, PNG).',
        });
      }

      const parseResult = CreateDocumentSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: parseResult.error.issues[0]?.message || 'Data formulir tidak lengkap',
        });
      }

      const { vendor, wa_vendor, judul, deadline, catatan } = parseResult.data;

      // Unggah ke Google Drive
      const uploadResult = await googleService.uploadToDrive({
        buffer: req.file.buffer,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
      });

      // Simpan data ke Google Sheets
      const newDoc = await googleService.createDocument({
        vendor,
        wa_vendor: wa_vendor || '',
        judul,
        deadline: deadline || '',
        catatan: catatan || '',
        drive_file_id: uploadResult.fileId,
        drive_url: uploadResult.webViewLink,
        nama_file: req.file.originalname,
        diunggah_oleh: req.user?.username || 'admin',
      });

      return res.status(201).json({
        success: true,
        message: 'Dokumen vendor berhasil diunggah dan disimpan.',
        data: newDoc,
      });
    } catch (err: any) {
      console.error('Error creating document:', err);
      return res.status(500).json({
        success: false,
        message: 'Gagal memproses unggahan dokumen: ' + err.message,
      });
    }
  }
);

// GET /api/documents/:id (Detail dokumen, versi, riwayat status)
documentsRouter.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const doc = await googleService.getDocumentById(id);
    if (!doc) {
      return res.status(404).json({
        success: false,
        message: 'Dokumen tidak ditemukan.',
      });
    }

    const versions = await googleService.getDocumentVersions(id);
    const history = await googleService.getStatusHistory(id);

    return res.json({
      success: true,
      data: {
        document: doc,
        versions,
        history,
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil detail dokumen: ' + err.message,
    });
  }
});

// PUT /api/documents/:id (Edit metadata dokumen)
documentsRouter.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const parseResult = UpdateDocumentSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: parseResult.error.issues[0]?.message || 'Input edit tidak valid',
      });
    }

    const updated = await googleService.updateDocument(id, parseResult.data);
    return res.json({
      success: true,
      message: 'Data dokumen berhasil diperbarui.',
      data: updated,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Gagal memperbarui data dokumen: ' + err.message,
    });
  }
});

// DELETE /api/documents/:id (Soft delete dokumen)
documentsRouter.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const success = await googleService.deleteDocument(id);
    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Dokumen tidak ditemukan untuk dihapus.',
      });
    }
    return res.json({
      success: true,
      message: 'Dokumen berhasil dihapus.',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Gagal menghapus dokumen: ' + err.message,
    });
  }
});

// POST /api/documents/:id/status (Ganti status dokumen)
documentsRouter.post('/:id/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const parseResult = ChangeStatusSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: parseResult.error.issues[0]?.message || 'Input perubahan status tidak valid',
      });
    }

    const { status, catatan } = parseResult.data;
    const updated = await googleService.updateDocumentStatus(
      id,
      status,
      catatan,
      req.user?.username || 'admin'
    );

    return res.json({
      success: true,
      message: `Status dokumen berhasil diubah menjadi "${status}".`,
      data: updated,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Gagal mengubah status dokumen: ' + err.message,
    });
  }
});

// POST /api/documents/:id/version (Unggah versi baru tanpa menghapus versi lama)
documentsRouter.post(
  '/:id/version',
  dynamicUploadMiddleware('file'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Berkas revisi baru wajib dilampirkan.',
        });
      }

      const parseResult = UpdateVersionSchema.safeParse(req.body);
      const catatan = parseResult.success ? parseResult.data.catatan : '';

      // Upload file revisi baru ke Drive
      const uploadResult = await googleService.uploadToDrive({
        buffer: req.file.buffer,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
      });

      // Simpan sebagai versi baru
      const updatedDoc = await googleService.uploadNewVersion(id, {
        drive_file_id: uploadResult.fileId,
        drive_url: uploadResult.webViewLink,
        nama_file: req.file.originalname,
        diunggah_oleh: req.user?.username || 'admin',
        catatan,
      });

      return res.json({
        success: true,
        message: `Berkas revisi versi ${updatedDoc.versi} berhasil diunggah.`,
        data: updatedDoc,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: 'Gagal mengunggah versi baru: ' + err.message,
      });
    }
  }
);
