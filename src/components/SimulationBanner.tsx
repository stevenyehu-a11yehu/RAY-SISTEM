import React, { useState } from 'react';
import { GoogleConnectionStatus } from '../types';
import { Database, ShieldCheck, AlertCircle, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

interface Props {
  status: GoogleConnectionStatus | null;
}

export const SimulationBanner: React.FC<Props> = ({ status }) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!status) return null;

  const isLive = status.mode === 'live_google';

  const copyEnvSnippet = () => {
    const text = `GOOGLE_SPREADSHEET_ID="isi_spreadsheet_id_anda"
GOOGLE_DRIVE_FOLDER_ID="isi_folder_id_drive_anda"
GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"..."}'
FONNTE_TOKEN="isi_token_fonnte_anda"`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`border-b text-xs transition-colors ${
        isLive
          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
          : 'bg-amber-50/90 border-amber-200 text-amber-950'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {isLive ? (
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          )}
          <span>
            {isLive ? (
              <strong>Google Sheets & Drive Live:</strong>
            ) : (
              <strong>Mode Siaga Simulasi Lokal:</strong>
            )}{' '}
            {isLive
              ? 'Terhubung langsung ke Google Sheets & Google Drive.'
              : 'Google Service Account belum diisi di .env. Seluruh fungsi (CRUD, status, revisi, template pengingat) aktif dan tersimpan di memori server untuk pengujian langsung.'}
          </span>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900 underline cursor-pointer"
        >
          {expanded ? 'Tutup Panduan' : 'Cara Hubungkan Live Google'}
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {expanded && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 pb-4 border-t border-amber-200/60 bg-amber-100/40 text-slate-700 text-xs leading-relaxed space-y-2">
          <p className="font-semibold text-slate-800">
            Langkah Cepat Menghubungkan Google Service Account & Fonnte:
          </p>
          <ol className="list-decimal list-inside space-y-1 ml-1 text-slate-600">
            <li>
              Buat Service Account di Google Cloud Console, unduh file kunci JSON-nya.
            </li>
            <li>
              Buat Google Spreadsheet baru dan Folder Google Drive, lalu <strong>Share (Bagikan)</strong> keduanya ke alamat email Service Account dengan peran <strong>Editor</strong>.
            </li>
            <li>
              Salin <strong>Spreadsheet ID</strong> (dari URL spreadsheet) dan <strong>Folder ID</strong> Google Drive.
            </li>
            <li>
              Buka akun di Fonnte (https://fonnte.com), scan QR WhatsApp, dan salin Token API Fonnte.
            </li>
            <li>
              Tambahkan variabel ke file <code>.env</code> Anda:
            </li>
          </ol>

          <div className="relative mt-2 p-3 bg-slate-900 text-slate-200 rounded-lg font-mono text-[11px] overflow-x-auto">
            <pre>
{`GOOGLE_SPREADSHEET_ID="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
GOOGLE_DRIVE_FOLDER_ID="1_Vq7Y-1oWXYZ987654321abcdef"
GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"..."}'
FONNTE_TOKEN="abc123tokenfonnte"`}
            </pre>
            <button
              onClick={copyEnvSnippet}
              className="absolute top-2 right-2 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[11px] flex items-center gap-1 cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Tersalin' : 'Salin Contoh'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
