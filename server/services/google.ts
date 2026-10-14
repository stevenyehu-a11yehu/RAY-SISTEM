import { google, sheets_v4, drive_v3 } from 'googleapis';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import {
  DocumentRecord,
  DocumentVersionRecord,
  StatusHistoryRecord,
  ReminderRuleRecord,
  ReminderLogRecord,
  UserRecord,
  AppSettings,
  DocumentStatus,
} from '../types.js';

// Mutex / Queue untuk mencegah race condition pada operasi tulis Google Sheets
class AsyncQueue {
  private queue: Promise<any> = Promise.resolve();

  enqueue<T>(task: () => Promise<T>): Promise<T> {
    const result = this.queue.then(async () => {
      try {
        return await task();
      } catch (err) {
        throw err;
      }
    });
    // Jangan biarkan rejection memutuskan rantai antrean
    this.queue = result.catch(() => {});
    return result;
  }
}

export const writeQueue = new AsyncQueue();

export class GoogleService {
  private sheets: sheets_v4.Sheets | null = null;
  private drive: drive_v3.Drive | null = null;
  public isConnected: boolean = false;
  private connectionError: string | null = null;

  // Fallback in-memory storage jika Google API belum dikonfigurasi
  // Memungkinkan aplikasi langsung dapat dijalankan & diuji di UI preview!
  private mockDocuments: DocumentRecord[] = [];
  private mockVersions: DocumentVersionRecord[] = [];
  private mockHistory: StatusHistoryRecord[] = [];
  private mockRules: ReminderRuleRecord[] = [];
  private mockLogs: ReminderLogRecord[] = [];
  private mockUsers: UserRecord[] = [];
  private mockSettings: Record<string, string> = {};

  // Simple in-memory cache dengan TTL untuk mereduksi request kuota Google Sheets
  private cache: {
    documents?: { data: DocumentRecord[]; expires: number };
    settings?: { data: Record<string, string>; expires: number };
    rules?: { data: ReminderRuleRecord[]; expires: number };
  } = {};
  private readonly CACHE_TTL_MS = 15000; // 15 detik cache read

  constructor() {
    this.initMockData();
    this.initClient();
  }

  private initMockData() {
    const now = new Date().toISOString();
    const hash = bcrypt.hashSync(config.adminInitialPassword, 10);

    this.mockUsers.push({
      id: crypto.randomUUID(),
      username: config.adminInitialUsername,
      password_hash: hash,
      dibuat_pada: now,
    });

    this.mockSettings = {
      fonnte_token: config.fonnteToken || '',
      default_wa_number: config.defaultWaNumber || '6281234567890',
      recipient_target: 'both',
      drive_folder_id: config.googleDriveFolderId || '',
      max_file_size_mb: String(config.defaultMaxFileSizeMb),
      timezone: config.defaultTimezone,
      deadline_h7_active: 'true',
      deadline_h3_active: 'true',
      deadline_h1_active: 'true',
      deadline_h0_active: 'true',
      deadline_h7_template: 'Halo {vendor}, pengingat formulir {judul} mendekati batas waktu (H-7: {deadline}). Mohon segera diproses. Link: {link}',
      deadline_h3_template: 'PENTING: Halo {vendor}, batas waktu formulir {judul} tinggal 3 hari lagi ({deadline}). Mohon segera dilengkapi. Link: {link}',
      deadline_h1_template: 'PERINGATAN: Halo {vendor}, besok ({deadline}) adalah batas waktu terakhir formulir {judul}. Link: {link}',
      deadline_h0_template: 'HARI INI: Batas waktu formulir {judul} dari {vendor} jatuh pada hari ini ({deadline}). Harap segera diselesaikan. Link: {link}',
    };

    this.mockRules = [
      {
        status: 'On Going',
        aktif: true,
        jam: '09:00',
        hari: '1,2,3,4,5',
        interval_hari: 2,
        template: 'Halo {vendor}, dokumen {judul} saat ini berstatus On Going (hari ke-{hari_berjalan}). Mohon prosesnya terus dipantau. Link berkas: {link}',
      },
      {
        status: 'Perlu Direvisi',
        aktif: true,
        jam: '10:00',
        hari: '1,2,3,4,5,6',
        interval_hari: 1,
        template: 'PERHATIAN {vendor}: Dokumen {judul} Perlu Direvisi. Catatan revisi telah tersedia. Mohon unggah revisi sebelum deadline {deadline}. Link: {link}',
      },
      {
        status: 'Perlu Ditandatangani',
        aktif: true,
        jam: '14:00',
        hari: '1,2,3,4,5',
        interval_hari: 1,
        template: 'Halo {vendor}, dokumen {judul} menunggu tanda tangan PIC. Mohon segera ditandatangani dan diunggah ulang. Link: {link}',
      },
    ];

    // Seed contoh dokumen awal untuk kemudahan demonstrasi
    const doc1Id = crypto.randomUUID();
    const doc2Id = crypto.randomUUID();
    const doc3Id = crypto.randomUUID();

    const d1 = new Date();
    d1.setDate(d1.getDate() + 3);
    const d2 = new Date();
    d2.setDate(d2.getDate() + 1);
    const d3 = new Date();
    d3.setDate(d3.getDate() - 1);

    this.mockDocuments = [
      {
        id: doc1Id,
        vendor: 'PT Maju Bersama Logistik',
        wa_vendor: '6281298765432',
        judul: 'Formulir Pendaftaran Rekanan & Pakta Integritas 2026',
        status: 'On Going',
        deadline: d1.toISOString().split('T')[0],
        drive_file_id: 'mock_drive_file_1',
        drive_url: 'https://drive.google.com/file/d/sample1/view',
        versi: 1,
        catatan: 'Dokumen lengkap, menunggu verifikasi kelengkapan perpajakan.',
        dibuat_pada: new Date(Date.now() - 3 * 86400000).toISOString(),
        diubah_pada: new Date(Date.now() - 3 * 86400000).toISOString(),
        dihapus: false,
      },
      {
        id: doc2Id,
        vendor: 'CV Berkah Teknik Prima',
        wa_vendor: '6285612345678',
        judul: 'Surat Pernyataan Kesanggupan SLA Pemeliharaan Genset',
        status: 'Perlu Direvisi',
        deadline: d2.toISOString().split('T')[0],
        drive_file_id: 'mock_drive_file_2',
        drive_url: 'https://drive.google.com/file/d/sample2/view',
        versi: 2,
        catatan: 'Lampiran sertifikasi teknisi K3 belum terlampir. Harap dilengkapi.',
        dibuat_pada: new Date(Date.now() - 5 * 86400000).toISOString(),
        diubah_pada: new Date(Date.now() - 1 * 86400000).toISOString(),
        dihapus: false,
      },
      {
        id: doc3Id,
        vendor: 'PT Solusi Data Nusantara',
        wa_vendor: '6287711223344',
        judul: 'Perjanjian Kerahasiaan Informasi (Non-Disclosure Agreement)',
        status: 'Perlu Ditandatangani',
        deadline: d3.toISOString().split('T')[0],
        drive_file_id: 'mock_drive_file_3',
        drive_url: 'https://drive.google.com/file/d/sample3/view',
        versi: 1,
        catatan: 'Draft NDA sudah disetujui legal. Menunggu tanda tangan basah & materai PIC vendor.',
        dibuat_pada: new Date(Date.now() - 7 * 86400000).toISOString(),
        diubah_pada: new Date(Date.now() - 2 * 86400000).toISOString(),
        dihapus: false,
      },
    ];

    this.mockVersions = [
      {
        id: crypto.randomUUID(),
        document_id: doc1Id,
        versi: 1,
        drive_file_id: 'mock_drive_file_1',
        drive_url: 'https://drive.google.com/file/d/sample1/view',
        nama_file: 'Form_Rekanan_PT_Maju_Bersama.pdf',
        diunggah_pada: new Date(Date.now() - 3 * 86400000).toISOString(),
        diunggah_oleh: 'admin',
      },
      {
        id: crypto.randomUUID(),
        document_id: doc2Id,
        versi: 1,
        drive_file_id: 'mock_drive_file_2_v1',
        drive_url: 'https://drive.google.com/file/d/sample2_v1/view',
        nama_file: 'SLA_Genset_Draft1.pdf',
        diunggah_pada: new Date(Date.now() - 5 * 86400000).toISOString(),
        diunggah_oleh: 'admin',
      },
      {
        id: crypto.randomUUID(),
        document_id: doc2Id,
        versi: 2,
        drive_file_id: 'mock_drive_file_2',
        drive_url: 'https://drive.google.com/file/d/sample2/view',
        nama_file: 'SLA_Genset_Draft2_Revisi.pdf',
        diunggah_pada: new Date(Date.now() - 1 * 86400000).toISOString(),
        diunggah_oleh: 'admin',
      },
    ];

    this.mockHistory = [
      {
        id: crypto.randomUUID(),
        document_id: doc1Id,
        status_lama: '-',
        status_baru: 'On Going',
        catatan: 'Dokumen diunggah pertama kali.',
        oleh: 'admin',
        waktu: new Date(Date.now() - 3 * 86400000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        document_id: doc2Id,
        status_lama: 'On Going',
        status_baru: 'Perlu Direvisi',
        catatan: 'Sertifikat K3 belum lengkap.',
        oleh: 'admin',
        waktu: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        document_id: doc3Id,
        status_lama: 'On Going',
        status_baru: 'Perlu Ditandatangani',
        catatan: 'Legal review approved. Kirim untuk tanda tangan.',
        oleh: 'admin',
        waktu: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
    ];
  }

  private initClient() {
    try {
      let credentials: any = null;

      if (config.googleServiceAccountJson) {
        credentials = JSON.parse(config.googleServiceAccountJson);
      } else if (config.googleServiceAccountPath && fs.existsSync(config.googleServiceAccountPath)) {
        const fileContent = fs.readFileSync(config.googleServiceAccountPath, 'utf8');
        credentials = JSON.parse(fileContent);
      }

      if (credentials && config.googleSpreadsheetId) {
        const auth = new google.auth.GoogleAuth({
          credentials,
          scopes: [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive',
          ],
        });

        this.sheets = google.sheets({ version: 'v4', auth });
        this.drive = google.drive({ version: 'v3', auth });
        this.isConnected = true;
        this.connectionError = null;
        console.log('✅ Google API Client (Sheets & Drive) berhasil diinisialisasi dengan Service Account.');

        // Inisialisasi sheet otomatis di background
        this.bootstrapSpreadsheet().catch((err) => {
          console.error('⚠️ Gagal bootstrap tab Google Sheets:', err.message);
        });
      } else {
        this.isConnected = false;
        this.connectionError = 'Kredensial Service Account atau Spreadsheet ID belum diatur di .env. Menggunakan mode simulasi lokal.';
        console.log('ℹ️ Mode simulasi aktif: Google Service Account belum diisi di .env. Data tersimpan di memori server.');
      }
    } catch (err: any) {
      this.isConnected = false;
      this.connectionError = err.message;
      console.warn('⚠️ Gagal menginisialisasi Google API Client:', err.message);
    }
  }

  public getConnectionStatus() {
    return {
      connected: this.isConnected,
      spreadsheetId: config.googleSpreadsheetId ? `${config.googleSpreadsheetId.slice(0, 6)}...` : null,
      folderId: config.googleDriveFolderId ? `${config.googleDriveFolderId.slice(0, 6)}...` : null,
      error: this.connectionError,
      mode: this.isConnected ? 'live_google' : 'simulation',
    };
  }

  // --- BOOTSTRAP TAB & HEADER DI SPREADSHEET ---
  public async bootstrapSpreadsheet() {
    if (!this.isConnected || !this.sheets || !config.googleSpreadsheetId) return;

    return writeQueue.enqueue(async () => {
      try {
        const meta = await this.sheets!.spreadsheets.get({
          spreadsheetId: config.googleSpreadsheetId,
        });

        const existingSheets = meta.data.sheets?.map((s) => s.properties?.title) || [];

        const requiredTabs: { title: string; headers: string[] }[] = [
          {
            title: 'Documents',
            headers: [
              'id',
              'vendor',
              'wa_vendor',
              'judul',
              'status',
              'deadline',
              'drive_file_id',
              'drive_url',
              'versi',
              'catatan',
              'dibuat_pada',
              'diubah_pada',
              'dihapus',
            ],
          },
          {
            title: 'DocumentVersions',
            headers: [
              'id',
              'document_id',
              'versi',
              'drive_file_id',
              'drive_url',
              'nama_file',
              'diunggah_pada',
              'diunggah_oleh',
            ],
          },
          {
            title: 'StatusHistory',
            headers: [
              'id',
              'document_id',
              'status_lama',
              'status_baru',
              'catatan',
              'oleh',
              'waktu',
            ],
          },
          {
            title: 'Settings',
            headers: ['key', 'value'],
          },
          {
            title: 'ReminderRules',
            headers: ['status', 'aktif', 'jam', 'hari', 'interval_hari', 'template'],
          },
          {
            title: 'ReminderLogs',
            headers: [
              'id',
              'document_id',
              'rule_key',
              'tujuan',
              'pesan',
              'waktu_kirim',
              'status_kirim',
              'respons_fonnte',
            ],
          },
          {
            title: 'Users',
            headers: ['id', 'username', 'password_hash', 'dibuat_pada'],
          },
        ];

        // 1. Buat sheet yang belum ada
        const requestsToAdd: any[] = [];
        for (const tab of requiredTabs) {
          if (!existingSheets.includes(tab.title)) {
            requestsToAdd.push({
              addSheet: {
                properties: { title: tab.title },
              },
            });
          }
        }

        if (requestsToAdd.length > 0) {
          await this.sheets!.spreadsheets.batchUpdate({
            spreadsheetId: config.googleSpreadsheetId,
            requestBody: { requests: requestsToAdd },
          });
        }

        // 2. Set headers jika baris pertama kosong
        for (const tab of requiredTabs) {
          const check = await this.sheets!.spreadsheets.values.get({
            spreadsheetId: config.googleSpreadsheetId,
            range: `${tab.title}!A1:Z1`,
          });

          if (!check.data.values || check.data.values.length === 0) {
            await this.sheets!.spreadsheets.values.update({
              spreadsheetId: config.googleSpreadsheetId,
              range: `${tab.title}!A1`,
              valueInputOption: 'USER_ENTERED',
              requestBody: { values: [tab.headers] },
            });
          }
        }

        // 3. Seed Users jika tab Users kosong
        const usersCheck = await this.sheets!.spreadsheets.values.get({
          spreadsheetId: config.googleSpreadsheetId,
          range: 'Users!A2:D2',
        });
        if (!usersCheck.data.values || usersCheck.data.values.length === 0) {
          const passHash = bcrypt.hashSync(config.adminInitialPassword, 10);
          await this.sheets!.spreadsheets.values.append({
            spreadsheetId: config.googleSpreadsheetId,
            range: 'Users!A:D',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: [
                [
                  crypto.randomUUID(),
                  config.adminInitialUsername,
                  passHash,
                  new Date().toISOString(),
                ],
              ],
            },
          });
        }

        // 4. Seed Settings jika kosong
        const settingsCheck = await this.sheets!.spreadsheets.values.get({
          spreadsheetId: config.googleSpreadsheetId,
          range: 'Settings!A2:B',
        });
        if (!settingsCheck.data.values || settingsCheck.data.values.length === 0) {
          const defaultSettingsRows = Object.entries(this.mockSettings).map(([k, v]) => [k, v]);
          await this.sheets!.spreadsheets.values.append({
            spreadsheetId: config.googleSpreadsheetId,
            range: 'Settings!A:B',
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: defaultSettingsRows },
          });
        }

        // 5. Seed ReminderRules jika kosong
        const rulesCheck = await this.sheets!.spreadsheets.values.get({
          spreadsheetId: config.googleSpreadsheetId,
          range: 'ReminderRules!A2:F',
        });
        if (!rulesCheck.data.values || rulesCheck.data.values.length === 0) {
          const defaultRulesRows = this.mockRules.map((r) => [
            r.status,
            r.aktif ? 'TRUE' : 'FALSE',
            r.jam,
            r.hari,
            String(r.interval_hari),
            r.template,
          ]);
          await this.sheets!.spreadsheets.values.append({
            spreadsheetId: config.googleSpreadsheetId,
            range: 'ReminderRules!A:F',
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: defaultRulesRows },
          });
        }

        console.log('✅ Google Sheets berhasil diverifikasi dan dibootstrap.');
      } catch (err: any) {
        console.error('Error saat bootstrap spreadsheet:', err);
      }
    });
  }

  // --- GOOGLE DRIVE UPLOAD ---
  public async uploadToDrive(file: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
  }): Promise<{ fileId: string; webViewLink: string }> {
    if (!this.isConnected || !this.drive) {
      // Mock Drive Upload
      const fakeId = `mock_drive_${crypto.randomUUID().slice(0, 8)}`;
      return {
        fileId: fakeId,
        webViewLink: `https://drive.google.com/file/d/${fakeId}/view?usp=sharing`,
      };
    }

    try {
      const { Readable } = await import('stream');
      const stream = new Readable();
      stream.push(file.buffer);
      stream.push(null);

      const targetFolderId = config.googleDriveFolderId || (await this.getSetting('drive_folder_id'));

      const fileMetadata: any = {
        name: file.originalname,
      };
      if (targetFolderId) {
        fileMetadata.parents = [targetFolderId];
      }

      const media = {
        mimeType: file.mimetype,
        body: stream,
      };

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink, webContentLink',
      });

      const fileId = response.data.id || '';
      let webViewLink = response.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

      // Set permission agar berkas bisa dibuka oleh siapa saja yang memiliki tautan (View only)
      try {
        await this.drive.permissions.create({
          fileId: fileId,
          requestBody: {
            role: 'reader',
            type: 'anyone',
          },
        });
      } catch (permErr: any) {
        console.warn('Gagal mengatur permission publik Drive (mungkin dibatasi domain org):', permErr.message);
      }

      return { fileId, webViewLink };
    } catch (err: any) {
      console.error('Drive upload error:', err);
      throw new Error(`Gagal mengunggah berkas ke Google Drive: ${err.message}`);
    }
  }

  // --- USERS ---
  public async getUserByUsername(username: string): Promise<UserRecord | null> {
    if (!this.isConnected || !this.sheets) {
      const found = this.mockUsers.find((u) => u.username.toLowerCase() === username.toLowerCase());
      return found || null;
    }

    try {
      const res = await this.sheets.spreadsheets.values.get({
        spreadsheetId: config.googleSpreadsheetId,
        range: 'Users!A2:D',
      });
      const rows = res.data.values || [];
      for (const row of rows) {
        if (row[1] && row[1].toLowerCase() === username.toLowerCase()) {
          return {
            id: row[0],
            username: row[1],
            password_hash: row[2],
            dibuat_pada: row[3],
          };
        }
      }
      return null;
    } catch (err) {
      console.error('Error fetching user:', err);
      return null;
    }
  }

  public async createUser(username: string, passwordHash: string): Promise<UserRecord> {
    const newUser: UserRecord = {
      id: crypto.randomUUID(),
      username,
      password_hash: passwordHash,
      dibuat_pada: new Date().toISOString(),
    };

    if (!this.isConnected || !this.sheets) {
      this.mockUsers.push(newUser);
      return newUser;
    }

    return writeQueue.enqueue(async () => {
      await this.sheets!.spreadsheets.values.append({
        spreadsheetId: config.googleSpreadsheetId,
        range: 'Users!A:D',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[newUser.id, newUser.username, newUser.password_hash, newUser.dibuat_pada]],
        },
      });
      return newUser;
    });
  }

  // --- DOCUMENTS ---
  public async getDocuments(): Promise<DocumentRecord[]> {
    // Cek cache
    if (this.cache.documents && Date.now() < this.cache.documents.expires) {
      return this.cache.documents.data.filter((d) => !d.dihapus);
    }

    if (!this.isConnected || !this.sheets) {
      const active = this.mockDocuments.filter((d) => !d.dihapus);
      return active;
    }

    try {
      const res = await this.sheets.spreadsheets.values.get({
        spreadsheetId: config.googleSpreadsheetId,
        range: 'Documents!A2:M',
      });

      const rows = res.data.values || [];
      const docs: DocumentRecord[] = rows.map((r) => ({
        id: r[0] || '',
        vendor: r[1] || '',
        wa_vendor: r[2] || '',
        judul: r[3] || '',
        status: (r[4] as DocumentStatus) || 'On Going',
        deadline: r[5] || '',
        drive_file_id: r[6] || '',
        drive_url: r[7] || '',
        versi: parseInt(r[8] || '1', 10),
        catatan: r[9] || '',
        dibuat_pada: r[10] || '',
        diubah_pada: r[11] || '',
        dihapus: String(r[12]).toUpperCase() === 'TRUE',
      }));

      this.cache.documents = {
        data: docs,
        expires: Date.now() + this.CACHE_TTL_MS,
      };

      return docs.filter((d) => !d.dihapus);
    } catch (err: any) {
      console.error('Error fetching documents from Google Sheets:', err.message);
      return this.mockDocuments.filter((d) => !d.dihapus);
    }
  }

  public async getDocumentById(id: string): Promise<DocumentRecord | null> {
    const all = await this.getDocuments();
    return all.find((d) => d.id === id) || null;
  }

  public async createDocument(data: {
    vendor: string;
    wa_vendor: string;
    judul: string;
    deadline?: string;
    catatan?: string;
    drive_file_id: string;
    drive_url: string;
    nama_file: string;
    diunggah_oleh: string;
  }): Promise<DocumentRecord> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const doc: DocumentRecord = {
      id,
      vendor: data.vendor,
      wa_vendor: data.wa_vendor,
      judul: data.judul,
      status: 'On Going',
      deadline: data.deadline || '',
      drive_file_id: data.drive_file_id,
      drive_url: data.drive_url,
      versi: 1,
      catatan: data.catatan || '',
      dibuat_pada: now,
      diubah_pada: now,
      dihapus: false,
    };

    const version: DocumentVersionRecord = {
      id: crypto.randomUUID(),
      document_id: id,
      versi: 1,
      drive_file_id: data.drive_file_id,
      drive_url: data.drive_url,
      nama_file: data.nama_file,
      diunggah_pada: now,
      diunggah_oleh: data.diunggah_oleh,
    };

    const history: StatusHistoryRecord = {
      id: crypto.randomUUID(),
      document_id: id,
      status_lama: '-',
      status_baru: 'On Going',
      catatan: 'Dokumen diunggah pertama kali.',
      oleh: data.diunggah_oleh,
      waktu: now,
    };

    if (!this.isConnected || !this.sheets) {
      this.mockDocuments.unshift(doc);
      this.mockVersions.unshift(version);
      this.mockHistory.unshift(history);
      this.cache.documents = undefined;
      return doc;
    }

    return writeQueue.enqueue(async () => {
      // Append ke Documents
      await this.sheets!.spreadsheets.values.append({
        spreadsheetId: config.googleSpreadsheetId,
        range: 'Documents!A:M',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [
            [
              doc.id,
              doc.vendor,
              doc.wa_vendor,
              doc.judul,
              doc.status,
              doc.deadline,
              doc.drive_file_id,
              doc.drive_url,
              doc.versi,
              doc.catatan,
              doc.dibuat_pada,
              doc.diubah_pada,
              'FALSE',
            ],
          ],
        },
      });

      // Append ke DocumentVersions
      await this.sheets!.spreadsheets.values.append({
        spreadsheetId: config.googleSpreadsheetId,
        range: 'DocumentVersions!A:H',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [
            [
              version.id,
              version.document_id,
              version.versi,
              version.drive_file_id,
              version.drive_url,
              version.nama_file,
              version.diunggah_pada,
              version.diunggah_oleh,
            ],
          ],
        },
      });

      // Append ke StatusHistory
      await this.sheets!.spreadsheets.values.append({
        spreadsheetId: config.googleSpreadsheetId,
        range: 'StatusHistory!A:G',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [
            [
              history.id,
              history.document_id,
              history.status_lama,
              history.status_baru,
              history.catatan,
              history.oleh,
              history.waktu,
            ],
          ],
        },
      });

      this.cache.documents = undefined;
      return doc;
    });
  }

  public async updateDocumentStatus(
    documentId: string,
    newStatus: DocumentStatus,
    catatan: string,
    oleh: string
  ): Promise<DocumentRecord> {
    const doc = await this.getDocumentById(documentId);
    if (!doc) throw new Error('Dokumen tidak ditemukan.');

    const oldStatus = doc.status;
    const now = new Date().toISOString();

    const history: StatusHistoryRecord = {
      id: crypto.randomUUID(),
      document_id: documentId,
      status_lama: oldStatus,
      status_baru: newStatus,
      catatan: catatan || `Perubahan status menjadi ${newStatus}`,
      oleh,
      waktu: now,
    };

    if (!this.isConnected || !this.sheets) {
      doc.status = newStatus;
      doc.diubah_pada = now;
      if (catatan) doc.catatan = catatan;
      this.mockHistory.unshift(history);
      this.cache.documents = undefined;
      return doc;
    }

    return writeQueue.enqueue(async () => {
      // Temukan baris dokumen di Documents
      const res = await this.sheets!.spreadsheets.values.get({
        spreadsheetId: config.googleSpreadsheetId,
        range: 'Documents!A2:A',
      });
      const ids = res.data.values || [];
      const rowIndex = ids.findIndex((row) => row[0] === documentId);
      if (rowIndex === -1) throw new Error('Baris dokumen tidak ditemukan di Sheet.');

      const sheetRowNum = rowIndex + 2;

      // Update kolom status (E), catatan (J), diubah_pada (L)
      await this.sheets!.spreadsheets.values.update({
        spreadsheetId: config.googleSpreadsheetId,
        range: `Documents!E${sheetRowNum}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[newStatus]] },
      });

      await this.sheets!.spreadsheets.values.update({
        spreadsheetId: config.googleSpreadsheetId,
        range: `Documents!J${sheetRowNum}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[catatan || doc.catatan]] },
      });

      await this.sheets!.spreadsheets.values.update({
        spreadsheetId: config.googleSpreadsheetId,
        range: `Documents!L${sheetRowNum}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[now]] },
      });

      // Append ke StatusHistory
      await this.sheets!.spreadsheets.values.append({
        spreadsheetId: config.googleSpreadsheetId,
        range: 'StatusHistory!A:G',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [
            [
              history.id,
              history.document_id,
              history.status_lama,
              history.status_baru,
              history.catatan,
              history.oleh,
              history.waktu,
            ],
          ],
        },
      });

      this.cache.documents = undefined;
      doc.status = newStatus;
      doc.diubah_pada = now;
      doc.catatan = catatan || doc.catatan;
      return doc;
    });
  }

  public async uploadNewVersion(
    documentId: string,
    fileData: {
      drive_file_id: string;
      drive_url: string;
      nama_file: string;
      diunggah_oleh: string;
      catatan?: string;
    }
  ): Promise<DocumentRecord> {
    const doc = await this.getDocumentById(documentId);
    if (!doc) throw new Error('Dokumen tidak ditemukan.');

    const newVersionNumber = doc.versi + 1;
    const now = new Date().toISOString();

    const versionRecord: DocumentVersionRecord = {
      id: crypto.randomUUID(),
      document_id: documentId,
      versi: newVersionNumber,
      drive_file_id: fileData.drive_file_id,
      drive_url: fileData.drive_url,
      nama_file: fileData.nama_file,
      diunggah_pada: now,
      diunggah_oleh: fileData.diunggah_oleh,
    };

    const historyRecord: StatusHistoryRecord = {
      id: crypto.randomUUID(),
      document_id: documentId,
      status_lama: doc.status,
      status_baru: doc.status,
      catatan: `Unggah versi baru (v${newVersionNumber}): ${fileData.nama_file}. ${fileData.catatan || ''}`,
      oleh: fileData.diunggah_oleh,
      waktu: now,
    };

    if (!this.isConnected || !this.sheets) {
      doc.versi = newVersionNumber;
      doc.drive_file_id = fileData.drive_file_id;
      doc.drive_url = fileData.drive_url;
      doc.diubah_pada = now;
      if (fileData.catatan) doc.catatan = fileData.catatan;

      this.mockVersions.unshift(versionRecord);
      this.mockHistory.unshift(historyRecord);
      this.cache.documents = undefined;
      return doc;
    }

    return writeQueue.enqueue(async () => {
      // Cari baris dokumen
      const res = await this.sheets!.spreadsheets.values.get({
        spreadsheetId: config.googleSpreadsheetId,
        range: 'Documents!A2:A',
      });
      const ids = res.data.values || [];
      const rowIndex = ids.findIndex((row) => row[0] === documentId);
      if (rowIndex === -1) throw new Error('Baris dokumen tidak ditemukan di Sheet.');

      const sheetRowNum = rowIndex + 2;

      // Update kolom drive_file_id (G), drive_url (H), versi (I), catatan (J), diubah_pada (L)
      await this.sheets!.spreadsheets.values.update({
        spreadsheetId: config.googleSpreadsheetId,
        range: `Documents!G${sheetRowNum}:I${sheetRowNum}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[fileData.drive_file_id, fileData.drive_url, newVersionNumber]],
        },
      });

      if (fileData.catatan) {
        await this.sheets!.spreadsheets.values.update({
          spreadsheetId: config.googleSpreadsheetId,
          range: `Documents!J${sheetRowNum}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [[fileData.catatan]] },
        });
      }

      await this.sheets!.spreadsheets.values.update({
        spreadsheetId: config.googleSpreadsheetId,
        range: `Documents!L${sheetRowNum}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[now]] },
      });

      // Append ke DocumentVersions
      await this.sheets!.spreadsheets.values.append({
        spreadsheetId: config.googleSpreadsheetId,
        range: 'DocumentVersions!A:H',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [
            [
              versionRecord.id,
              versionRecord.document_id,
              versionRecord.versi,
              versionRecord.drive_file_id,
              versionRecord.drive_url,
              versionRecord.nama_file,
              versionRecord.diunggah_pada,
              versionRecord.diunggah_oleh,
            ],
          ],
        },
      });

      // Append ke StatusHistory
      await this.sheets!.spreadsheets.values.append({
        spreadsheetId: config.googleSpreadsheetId,
        range: 'StatusHistory!A:G',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [
            [
              historyRecord.id,
              historyRecord.document_id,
              historyRecord.status_lama,
              historyRecord.status_baru,
              historyRecord.catatan,
              historyRecord.oleh,
              historyRecord.waktu,
            ],
          ],
        },
      });

      this.cache.documents = undefined;
      doc.versi = newVersionNumber;
      doc.drive_file_id = fileData.drive_file_id;
      doc.drive_url = fileData.drive_url;
      doc.diubah_pada = now;
      if (fileData.catatan) doc.catatan = fileData.catatan;
      return doc;
    });
  }

  public async updateDocument(
    documentId: string,
    updates: Partial<Pick<DocumentRecord, 'vendor' | 'wa_vendor' | 'judul' | 'deadline' | 'catatan'>>
  ): Promise<DocumentRecord> {
    const doc = await this.getDocumentById(documentId);
    if (!doc) throw new Error('Dokumen tidak ditemukan.');

    const now = new Date().toISOString();

    if (!this.isConnected || !this.sheets) {
      if (updates.vendor !== undefined) doc.vendor = updates.vendor;
      if (updates.wa_vendor !== undefined) doc.wa_vendor = updates.wa_vendor;
      if (updates.judul !== undefined) doc.judul = updates.judul;
      if (updates.deadline !== undefined) doc.deadline = updates.deadline;
      if (updates.catatan !== undefined) doc.catatan = updates.catatan;
      doc.diubah_pada = now;
      this.cache.documents = undefined;
      return doc;
    }

    return writeQueue.enqueue(async () => {
      const res = await this.sheets!.spreadsheets.values.get({
        spreadsheetId: config.googleSpreadsheetId,
        range: 'Documents!A2:A',
      });
      const ids = res.data.values || [];
      const rowIndex = ids.findIndex((row) => row[0] === documentId);
      if (rowIndex === -1) throw new Error('Baris dokumen tidak ditemukan di Sheet.');

      const sheetRowNum = rowIndex + 2;

      // Update B..D (vendor, wa_vendor, judul)
      const vendor = updates.vendor !== undefined ? updates.vendor : doc.vendor;
      const wa_vendor = updates.wa_vendor !== undefined ? updates.wa_vendor : doc.wa_vendor;
      const judul = updates.judul !== undefined ? updates.judul : doc.judul;
      const deadline = updates.deadline !== undefined ? updates.deadline : doc.deadline;
      const catatan = updates.catatan !== undefined ? updates.catatan : doc.catatan;

      await this.sheets!.spreadsheets.values.update({
        spreadsheetId: config.googleSpreadsheetId,
        range: `Documents!B${sheetRowNum}:D${sheetRowNum}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[vendor, wa_vendor, judul]] },
      });

      await this.sheets!.spreadsheets.values.update({
        spreadsheetId: config.googleSpreadsheetId,
        range: `Documents!F${sheetRowNum}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[deadline]] },
      });

      await this.sheets!.spreadsheets.values.update({
        spreadsheetId: config.googleSpreadsheetId,
        range: `Documents!J${sheetRowNum}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[catatan]] },
      });

      await this.sheets!.spreadsheets.values.update({
        spreadsheetId: config.googleSpreadsheetId,
        range: `Documents!L${sheetRowNum}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[now]] },
      });

      this.cache.documents = undefined;
      doc.vendor = vendor;
      doc.wa_vendor = wa_vendor;
      doc.judul = judul;
      doc.deadline = deadline;
      doc.catatan = catatan;
      doc.diubah_pada = now;
      return doc;
    });
  }

  public async deleteDocument(documentId: string): Promise<boolean> {
    const doc = await this.getDocumentById(documentId);
    if (!doc) return false;

    if (!this.isConnected || !this.sheets) {
      doc.dihapus = true;
      this.cache.documents = undefined;
      return true;
    }

    return writeQueue.enqueue(async () => {
      const res = await this.sheets!.spreadsheets.values.get({
        spreadsheetId: config.googleSpreadsheetId,
        range: 'Documents!A2:A',
      });
      const ids = res.data.values || [];
      const rowIndex = ids.findIndex((row) => row[0] === documentId);
      if (rowIndex === -1) return false;

      const sheetRowNum = rowIndex + 2;

      // Soft delete: set kolom M (dihapus) ke TRUE
      await this.sheets!.spreadsheets.values.update({
        spreadsheetId: config.googleSpreadsheetId,
        range: `Documents!M${sheetRowNum}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [['TRUE']] },
      });

      this.cache.documents = undefined;
      doc.dihapus = true;
      return true;
    });
  }

  // --- VERSIONS & HISTORY ---
  public async getDocumentVersions(documentId: string): Promise<DocumentVersionRecord[]> {
    if (!this.isConnected || !this.sheets) {
      return this.mockVersions
        .filter((v) => v.document_id === documentId)
        .sort((a, b) => b.versi - a.versi);
    }

    try {
      const res = await this.sheets.spreadsheets.values.get({
        spreadsheetId: config.googleSpreadsheetId,
        range: 'DocumentVersions!A2:H',
      });
      const rows = res.data.values || [];
      const versions: DocumentVersionRecord[] = rows
        .filter((r) => r[1] === documentId)
        .map((r) => ({
          id: r[0],
          document_id: r[1],
          versi: parseInt(r[2] || '1', 10),
          drive_file_id: r[3],
          drive_url: r[4],
          nama_file: r[5],
          diunggah_pada: r[6],
          diunggah_oleh: r[7],
        }))
        .sort((a, b) => b.versi - a.versi);
      return versions;
    } catch (err) {
      console.error('Error getting versions:', err);
      return [];
    }
  }

  public async getStatusHistory(documentId: string): Promise<StatusHistoryRecord[]> {
    if (!this.isConnected || !this.sheets) {
      return this.mockHistory
        .filter((h) => h.document_id === documentId)
        .sort((a, b) => new Date(b.waktu).getTime() - new Date(a.waktu).getTime());
    }

    try {
      const res = await this.sheets.spreadsheets.values.get({
        spreadsheetId: config.googleSpreadsheetId,
        range: 'StatusHistory!A2:G',
      });
      const rows = res.data.values || [];
      const history: StatusHistoryRecord[] = rows
        .filter((r) => r[1] === documentId)
        .map((r) => ({
          id: r[0],
          document_id: r[1],
          status_lama: r[2],
          status_baru: r[3],
          catatan: r[4],
          oleh: r[5],
          waktu: r[6],
        }))
        .sort((a, b) => new Date(b.waktu).getTime() - new Date(a.waktu).getTime());
      return history;
    } catch (err) {
      console.error('Error getting status history:', err);
      return [];
    }
  }

  // --- SETTINGS ---
  public async getSettings(): Promise<AppSettings> {
    if (this.cache.settings && Date.now() < this.cache.settings.expires) {
      return this.mapSettingsRecord(this.cache.settings.data);
    }

    if (!this.isConnected || !this.sheets) {
      return this.mapSettingsRecord(this.mockSettings);
    }

    try {
      const res = await this.sheets.spreadsheets.values.get({
        spreadsheetId: config.googleSpreadsheetId,
        range: 'Settings!A2:B',
      });
      const rows = res.data.values || [];
      const dict: Record<string, string> = {};
      for (const r of rows) {
        if (r[0]) dict[r[0]] = r[1] !== undefined ? r[1] : '';
      }

      this.cache.settings = {
        data: dict,
        expires: Date.now() + this.CACHE_TTL_MS,
      };

      return this.mapSettingsRecord(dict);
    } catch (err) {
      console.error('Error getting settings:', err);
      return this.mapSettingsRecord(this.mockSettings);
    }
  }

  private mapSettingsRecord(dict: Record<string, string>): AppSettings {
    return {
      fonnte_token: dict['fonnte_token'] || config.fonnteToken || '',
      default_wa_number: dict['default_wa_number'] || config.defaultWaNumber || '6281234567890',
      recipient_target: (dict['recipient_target'] as any) || 'both',
      drive_folder_id: dict['drive_folder_id'] || config.googleDriveFolderId || '',
      max_file_size_mb: parseInt(dict['max_file_size_mb'] || String(config.defaultMaxFileSizeMb), 10),
      timezone: dict['timezone'] || config.defaultTimezone,
      deadline_h7_active: dict['deadline_h7_active'] === 'true',
      deadline_h3_active: dict['deadline_h3_active'] === 'true',
      deadline_h1_active: dict['deadline_h1_active'] === 'true',
      deadline_h0_active: dict['deadline_h0_active'] === 'true',
      deadline_h7_template:
        dict['deadline_h7_template'] ||
        'Halo {vendor}, pengingat formulir {judul} mendekati batas waktu (H-7: {deadline}). Link: {link}',
      deadline_h3_template:
        dict['deadline_h3_template'] ||
        'PENTING: Halo {vendor}, batas waktu formulir {judul} tinggal 3 hari ({deadline}). Link: {link}',
      deadline_h1_template:
        dict['deadline_h1_template'] ||
        'PERINGATAN: Halo {vendor}, besok ({deadline}) batas waktu terakhir formulir {judul}. Link: {link}',
      deadline_h0_template:
        dict['deadline_h0_template'] ||
        'HARI INI: Batas waktu formulir {judul} dari {vendor} hari ini ({deadline}). Link: {link}',
    };
  }

  public async getSetting(key: string): Promise<string> {
    const s = await this.getSettings();
    return (s as any)[key] || '';
  }

  public async updateSettings(newSettings: Partial<AppSettings>): Promise<AppSettings> {
    if (!this.isConnected || !this.sheets) {
      for (const [k, v] of Object.entries(newSettings)) {
        this.mockSettings[k] = String(v);
      }
      this.cache.settings = undefined;
      return this.getSettings();
    }

    return writeQueue.enqueue(async () => {
      // Baca semua settings lama
      const res = await this.sheets!.spreadsheets.values.get({
        spreadsheetId: config.googleSpreadsheetId,
        range: 'Settings!A2:B',
      });
      const rows = res.data.values || [];
      const dict: Record<string, { rowIndex: number; val: string }> = {};

      rows.forEach((r, idx) => {
        if (r[0]) dict[r[0]] = { rowIndex: idx + 2, val: r[1] || '' };
      });

      for (const [k, v] of Object.entries(newSettings)) {
        if (v === undefined) continue;
        const stringVal = String(v);
        if (dict[k]) {
          // Update baris yang sudah ada
          await this.sheets!.spreadsheets.values.update({
            spreadsheetId: config.googleSpreadsheetId,
            range: `Settings!B${dict[k].rowIndex}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [[stringVal]] },
          });
        } else {
          // Append baris baru
          await this.sheets!.spreadsheets.values.append({
            spreadsheetId: config.googleSpreadsheetId,
            range: 'Settings!A:B',
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [[k, stringVal]] },
          });
        }
      }

      this.cache.settings = undefined;
      return this.getSettings();
    });
  }

  // --- REMINDER RULES ---
  public async getReminderRules(): Promise<ReminderRuleRecord[]> {
    if (this.cache.rules && Date.now() < this.cache.rules.expires) {
      return this.cache.rules.data;
    }

    if (!this.isConnected || !this.sheets) {
      return this.mockRules;
    }

    try {
      const res = await this.sheets.spreadsheets.values.get({
        spreadsheetId: config.googleSpreadsheetId,
        range: 'ReminderRules!A2:F',
      });
      const rows = res.data.values || [];
      const rules: ReminderRuleRecord[] = rows.map((r) => ({
        status: r[0] as any,
        aktif: String(r[1]).toUpperCase() === 'TRUE',
        jam: r[2] || '09:00',
        hari: r[3] || '1,2,3,4,5',
        interval_hari: parseInt(r[4] || '1', 10),
        template: r[5] || '',
      }));

      this.cache.rules = {
        data: rules,
        expires: Date.now() + this.CACHE_TTL_MS,
      };

      return rules;
    } catch (err) {
      console.error('Error fetching reminder rules:', err);
      return this.mockRules;
    }
  }

  public async updateReminderRules(rules: ReminderRuleRecord[]): Promise<ReminderRuleRecord[]> {
    if (!this.isConnected || !this.sheets) {
      this.mockRules = rules;
      this.cache.rules = undefined;
      return this.mockRules;
    }

    return writeQueue.enqueue(async () => {
      // Clear data baris di ReminderRules
      await this.sheets!.spreadsheets.values.clear({
        spreadsheetId: config.googleSpreadsheetId,
        range: 'ReminderRules!A2:F',
      });

      // Tulis ulang
      const values = rules.map((r) => [
        r.status,
        r.aktif ? 'TRUE' : 'FALSE',
        r.jam,
        r.hari,
        String(r.interval_hari),
        r.template,
      ]);

      await this.sheets!.spreadsheets.values.update({
        spreadsheetId: config.googleSpreadsheetId,
        range: 'ReminderRules!A2',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
      });

      this.cache.rules = undefined;
      return rules;
    });
  }

  // --- REMINDER LOGS ---
  public async getReminderLogs(limit: number = 200): Promise<ReminderLogRecord[]> {
    if (!this.isConnected || !this.sheets) {
      return [...this.mockLogs].reverse().slice(0, limit);
    }

    try {
      const res = await this.sheets.spreadsheets.values.get({
        spreadsheetId: config.googleSpreadsheetId,
        range: 'ReminderLogs!A2:H',
      });
      const rows = res.data.values || [];
      const logs: ReminderLogRecord[] = rows.map((r) => ({
        id: r[0] || '',
        document_id: r[1] || '',
        rule_key: r[2] || '',
        tujuan: r[3] || '',
        pesan: r[4] || '',
        waktu_kirim: r[5] || '',
        status_kirim: (r[6] as any) || 'gagal',
        respons_fonnte: r[7] || '',
      }));

      // Urutkan terbaru di atas
      return logs.reverse().slice(0, limit);
    } catch (err) {
      console.error('Error getting logs:', err);
      return [...this.mockLogs].reverse().slice(0, limit);
    }
  }

  public async hasLogForToday(documentId: string, ruleKey: string, dateStr: string): Promise<boolean> {
    // Mengecek idempotency: apakah rule_key pada documentId sudah dikirim hari ini
    const logs = await this.getReminderLogs(300);
    return logs.some(
      (log) =>
        log.document_id === documentId &&
        log.rule_key === ruleKey &&
        log.status_kirim === 'berhasil' &&
        log.waktu_kirim.startsWith(dateStr)
    );
  }

  public async logReminder(entry: Omit<ReminderLogRecord, 'id'>): Promise<ReminderLogRecord> {
    const record: ReminderLogRecord = {
      id: crypto.randomUUID(),
      ...entry,
    };

    if (!this.isConnected || !this.sheets) {
      this.mockLogs.unshift(record);
      return record;
    }

    return writeQueue.enqueue(async () => {
      await this.sheets!.spreadsheets.values.append({
        spreadsheetId: config.googleSpreadsheetId,
        range: 'ReminderLogs!A:H',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [
            [
              record.id,
              record.document_id,
              record.rule_key,
              record.tujuan,
              record.pesan,
              record.waktu_kirim,
              record.status_kirim,
              record.respons_fonnte,
            ],
          ],
        },
      });
      return record;
    });
  }
}

export const googleService = new GoogleService();
