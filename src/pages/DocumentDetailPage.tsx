import React, { useState, useEffect } from 'react';
import {
  DocumentRecord,
  DocumentVersionRecord,
  StatusHistoryRecord,
  AppSettings,
} from '../types';
import { api } from '../api';
import { StatusBadge } from '../components/StatusBadge';
import {
  ArrowLeft,
  ExternalLink,
  Edit3,
  Upload,
  Send,
  History,
  Layers,
  Calendar,
  Phone,
  User,
  Clock,
  CheckCircle,
  FileText,
  Save,
  X,
  Loader2,
} from 'lucide-react';

interface Props {
  documentId: string;
  settings: AppSettings | null;
  onBack: () => void;
  onChangeStatus: (doc: DocumentRecord) => void;
  onUploadNewVersion: (doc: DocumentRecord) => void;
  onTriggerSendWhatsApp: (doc: DocumentRecord) => void;
}

export const DocumentDetailPage: React.FC<Props> = ({
  documentId,
  settings,
  onBack,
  onChangeStatus,
  onUploadNewVersion,
  onTriggerSendWhatsApp,
}) => {
  const [doc, setDoc] = useState<DocumentRecord | null>(null);
  const [versions, setVersions] = useState<DocumentVersionRecord[]>([]);
  const [history, setHistory] = useState<StatusHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editVendor, setEditVendor] = useState('');
  const [editWaVendor, setEditWaVendor] = useState('');
  const [editJudul, setEditJudul] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [editCatatan, setEditCatatan] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const fetchDetail = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getDocumentDetail(documentId);
      setDoc(res.data.document);
      setVersions(res.data.versions);
      setHistory(res.data.history);

      // Populate edit fields
      setEditVendor(res.data.document.vendor);
      setEditWaVendor(res.data.document.wa_vendor);
      setEditJudul(res.data.document.judul);
      setEditDeadline(res.data.document.deadline);
      setEditCatatan(res.data.document.catatan);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat detail dokumen.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [documentId]);

  const handleSaveEdit = async () => {
    if (!doc) return;
    setIsSavingEdit(true);
    try {
      await api.updateDocument(doc.id, {
        vendor: editVendor.trim(),
        wa_vendor: editWaVendor.trim(),
        judul: editJudul.trim(),
        deadline: editDeadline,
        catatan: editCatatan.trim(),
      });
      setIsEditing(false);
      await fetchDetail();
    } catch (err: any) {
      alert('Gagal menyimpan perubahan: ' + err.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center space-y-3">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Memuat detail dokumen dari Sheets & Drive...</p>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="p-8 bg-rose-50 border border-rose-200 rounded-3xl text-center space-y-3">
        <p className="text-sm font-bold text-rose-800">{error || 'Dokumen tidak ditemukan'}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
        >
          Kembali ke Daftar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top back button and title header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Dokumen</span>
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onTriggerSendWhatsApp(doc)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Kirim WhatsApp Sekarang</span>
          </button>

          <button
            onClick={() => onChangeStatus(doc)}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Ganti Status</span>
          </button>

          <button
            onClick={() => onUploadNewVersion(doc)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Unggah Revisi Baru</span>
          </button>
        </div>
      </div>

      {/* Main Info Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={doc.status} size="md" />
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-xs">
                Versi Aktif: v{doc.versi}
              </span>
            </div>
            {isEditing ? (
              <input
                type="text"
                value={editJudul}
                onChange={(e) => setEditJudul(e.target.value)}
                className="mt-2 w-full px-3 py-1.5 text-base font-bold text-slate-900 border rounded-xl"
              />
            ) : (
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight pt-1">
                {doc.judul}
              </h2>
            )}
          </div>

          <div className="flex items-center gap-2">
            {doc.drive_url && (
              <a
                href={doc.drive_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Buka Berkas di Drive</span>
              </a>
            )}

            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Edit Data
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleSaveEdit}
                  disabled={isSavingEdit}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan</span>
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-2.5 py-1.5 border text-slate-600 rounded-xl text-xs cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Metadata Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
            <span className="text-slate-400 font-semibold block">Nama Rekanan / Vendor:</span>
            {isEditing ? (
              <input
                type="text"
                value={editVendor}
                onChange={(e) => setEditVendor(e.target.value)}
                className="w-full px-2 py-1 bg-white border rounded"
              />
            ) : (
              <span className="font-bold text-slate-800 text-sm block">{doc.vendor}</span>
            )}
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
            <span className="text-slate-400 font-semibold block">Nomor WhatsApp PIC:</span>
            {isEditing ? (
              <input
                type="text"
                value={editWaVendor}
                onChange={(e) => setEditWaVendor(e.target.value)}
                className="w-full px-2 py-1 bg-white border rounded"
              />
            ) : (
              <span className="font-bold text-slate-800 text-sm block">
                {doc.wa_vendor || <span className="text-slate-400 font-normal italic">Tidak ada</span>}
              </span>
            )}
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
            <span className="text-slate-400 font-semibold block">Batas Waktu (Deadline):</span>
            {isEditing ? (
              <input
                type="date"
                value={editDeadline}
                onChange={(e) => setEditDeadline(e.target.value)}
                className="w-full px-2 py-1 bg-white border rounded"
              />
            ) : (
              <span className="font-bold text-slate-800 text-sm block">
                {doc.deadline || <span className="text-slate-400 font-normal italic">Tidak ditentukan</span>}
              </span>
            )}
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
            <span className="text-slate-400 font-semibold block">Tanggal Dibuat:</span>
            <span className="font-bold text-slate-800 text-sm block">
              {new Date(doc.dibuat_pada).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* Catatan Box */}
        <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-1 text-xs">
          <span className="text-slate-500 font-semibold">Catatan / Ringkasan Dokumen:</span>
          {isEditing ? (
            <textarea
              rows={2}
              value={editCatatan}
              onChange={(e) => setEditCatatan(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border rounded-xl text-xs"
            />
          ) : (
            <p className="text-slate-700 leading-relaxed">
              {doc.catatan || <span className="italic text-slate-400">Tidak ada catatan tambahan.</span>}
            </p>
          )}
        </div>
      </div>

      {/* Grid: Riwayat Versi Berkas & Riwayat Perubahan Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Riwayat Versi Berkas */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Riwayat Versi Berkas</h3>
                <p className="text-xs text-slate-500">Semua file tersimpan aman tanpa menimpa</p>
              </div>
            </div>

            <button
              onClick={() => onUploadNewVersion(doc)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
            >
              + Unggah Revisi
            </button>
          </div>

          <div className="space-y-2.5">
            {versions.map((ver) => (
              <div
                key={ver.id}
                className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px]">
                      v{ver.versi}
                    </span>
                    <span className="font-bold text-slate-800 line-clamp-1">{ver.nama_file}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Diunggah oleh: <strong>{ver.diunggah_oleh}</strong> •{' '}
                    {new Date(ver.diunggah_pada).toLocaleString('id-ID')}
                  </p>
                </div>

                {ver.drive_url && (
                  <a
                    href={ver.drive_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-blue-600 hover:bg-blue-100/70 rounded-lg shrink-0"
                    title="Buka versi ini di Drive"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            ))}

            {versions.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">
                Belum ada riwayat versi tercatat.
              </p>
            )}
          </div>
        </div>

        {/* Riwayat Status (Audit Trail) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Riwayat Perubahan Status</h3>
              <p className="text-xs text-slate-500">Jejak audit pelaku, waktu, dan catatan</p>
            </div>
          </div>

          <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-slate-200">
            {history.map((hist, idx) => (
              <div key={hist.id} className="relative flex items-start gap-3 pl-1 text-xs">
                <div className="w-5 h-5 rounded-full bg-white border-2 border-emerald-600 flex items-center justify-center shrink-0 mt-0.5 z-10" />
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex-1 space-y-1">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span className="font-bold text-slate-800">
                      {hist.status_lama !== '-' ? `${hist.status_lama} ➔ ` : ''}
                      <span className="text-emerald-700">{hist.status_baru}</span>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(hist.waktu).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <p className="text-slate-600 leading-normal">{hist.catatan}</p>
                  <p className="text-[10px] text-slate-400">Oleh: {hist.oleh}</p>
                </div>
              </div>
            ))}

            {history.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">
                Belum ada riwayat status.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
