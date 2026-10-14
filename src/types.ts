export type DocumentStatus = 'On Going' | 'Perlu Direvisi' | 'Perlu Ditandatangani' | 'Selesai';

export interface DocumentRecord {
  id: string;
  vendor: string;
  wa_vendor: string;
  judul: string;
  status: DocumentStatus;
  deadline: string;
  drive_file_id: string;
  drive_url: string;
  versi: number;
  catatan: string;
  dibuat_pada: string;
  diubah_pada: string;
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

export interface ReminderRuleRecord {
  status: DocumentStatus | 'Deadline_H7' | 'Deadline_H3' | 'Deadline_H1' | 'Deadline_H0';
  aktif: boolean;
  jam: string;
  hari: string;
  interval_hari: number;
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

export interface AppSettings {
  fonnte_token?: string;
  fonnte_token_masked?: string;
  has_fonnte_token?: boolean;
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

export interface GoogleConnectionStatus {
  connected: boolean;
  spreadsheetId: string | null;
  folderId: string | null;
  error: string | null;
  mode: 'live_google' | 'simulation';
}

export interface UserProfile {
  id: string;
  username: string;
}

export interface KpiSummary {
  total: number;
  onGoing: number;
  perluDirevisi: number;
  perluDitandatangani: number;
  selesai: number;
  mendekatiDeadline: number;
  melewatiDeadline: number;
}
