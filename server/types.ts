export type DocumentStatus = 'On Going' | 'Perlu Direvisi' | 'Perlu Ditandatangani' | 'Selesai';

export interface DocumentRecord {
  id: string;
  vendor: string;
  wa_vendor: string;
  judul: string;
  status: DocumentStatus;
  deadline: string; // YYYY-MM-DD
  drive_file_id: string;
  drive_url: string;
  versi: number;
  catatan: string;
  dibuat_pada: string; // ISO 8601
  diubah_pada: string; // ISO 8601
  dihapus: boolean;
}

export interface DocumentVersionRecord {
  id: string;
  document_id: string;
  versi: number;
  drive_file_id: string;
  drive_url: string;
  nama_file: string;
  diunggah_pada: string;
  diunggah_oleh: string;
}

export interface StatusHistoryRecord {
  id: string;
  document_id: string;
  status_lama: string;
  status_baru: string;
  catatan: string;
  oleh: string;
  waktu: string;
}

export interface SettingRecord {
  key: string;
  value: string;
}

export interface ReminderRuleRecord {
  status: DocumentStatus | 'Deadline_H7' | 'Deadline_H3' | 'Deadline_H1' | 'Deadline_H0';
  aktif: boolean;
  jam: string; // e.g. "09:00"
  hari: string; // comma separated: "1,2,3,4,5" (1=Senin..7=Minggu)
  interval_hari: number; // 1 = tiap hari, 2 = tiap 2 hari, etc.
  template: string;
}

export interface ReminderLogRecord {
  id: string;
  document_id: string;
  rule_key: string;
  tujuan: string;
  pesan: string;
  waktu_kirim: string;
  status_kirim: 'berhasil' | 'gagal';
  respons_fonnte: string;
}

export interface UserRecord {
  id: string;
  username: string;
  password_hash: string;
  dibuat_pada: string;
}

export interface AppSettings {
  fonnte_token: string;
  default_wa_number: string;
  recipient_target: 'self' | 'vendor' | 'both';
  drive_folder_id: string;
  max_file_size_mb: number;
  timezone: string;
  deadline_h7_active: boolean;
  deadline_h3_active: boolean;
  deadline_h1_active: boolean;
  deadline_h0_active: boolean;
  deadline_h7_template: string;
  deadline_h3_template: string;
  deadline_h1_template: string;
  deadline_h0_template: string;
}
