import React, { useState } from 'react';
import { Modal } from './Modal';
import { DocumentRecord, DocumentStatus } from '../types';
import { api } from '../api';
import { Loader2, AlertCircle } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentRecord | null;
  onSuccess: () => void;
}

export const ChangeStatusModal: React.FC<Props> = ({
  isOpen,
  onClose,
  document,
  onSuccess,
}) => {
  const [newStatus, setNewStatus] = useState<DocumentStatus>('On Going');
  const [catatan, setCatatan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (document) {
      setNewStatus(document.status);
      setCatatan('');
      setError(null);
    }
  }, [document]);

  if (!document) return null;

  const statuses: DocumentStatus[] = [
    'On Going',
    'Perlu Direvisi',
    'Perlu Ditandatangani',
    'Selesai',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catatan.trim()) {
      setError('Catatan alasan perubahan status wajib diisi untuk riwayat audit.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await api.changeStatus(document.id, newStatus, catatan.trim());
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal mengubah status dokumen.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ubah Status Dokumen" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <p className="text-xs text-slate-500 font-medium">Dokumen:</p>
          <p className="text-sm font-bold text-slate-800 line-clamp-1">{document.judul}</p>
          <p className="text-xs text-slate-600">Vendor: {document.vendor}</p>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 block">Status Saat Ini:</span>
            <StatusBadge status={document.status} size="sm" />
          </div>
          <span className="text-slate-400 font-bold">➔</span>
          <div>
            <span className="text-[11px] text-slate-500 block">Status Baru:</span>
            <StatusBadge status={newStatus} size="sm" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Pilih Status Baru <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {statuses.map((st) => (
              <button
                type="button"
                key={st}
                onClick={() => setNewStatus(st)}
                className={`p-2.5 text-xs rounded-xl font-medium border text-left transition-all cursor-pointer ${
                  newStatus === st
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-semibold shadow-xs ring-1 ring-emerald-600'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Catatan Perubahan <span className="text-rose-500">*</span>
          </label>
          <textarea
            required
            rows={3}
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Tuliskan alasan perubahan status (contoh: Koreksi pajak disetujui, siap tanda tangan)..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-medium text-xs cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-xs shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <span>Simpan Perubahan</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
