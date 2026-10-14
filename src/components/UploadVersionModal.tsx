import React, { useState, useRef } from 'react';
import { Modal } from './Modal';
import { DocumentRecord } from '../types';
import { api } from '../api';
import { UploadCloud, File, AlertCircle, Loader2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentRecord | null;
  onSuccess: () => void;
  maxFileSizeMb?: number;
}

export const UploadVersionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  document,
  onSuccess,
  maxFileSizeMb = 10,
}) => {
  const [catatan, setCatatan] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!document) return null;

  const nextVersion = (document.versi || 1) + 1;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxBytes = maxFileSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      setError(`Ukuran berkas melebihi batas maksimum ${maxFileSizeMb} MB.`);
      return;
    }

    setError(null);
    setSelectedFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Pilih berkas revisi yang akan diunggah.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (catatan) formData.append('catatan', catatan.trim());

      await api.uploadNewVersion(document.id, formData);
      setSelectedFile(null);
      setCatatan('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal mengunggah versi baru.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Unggah Revisi Berkas (Versi ${nextVersion})`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
          <p className="text-xs text-slate-500 font-medium">Dokumen Target:</p>
          <p className="text-sm font-bold text-slate-800 line-clamp-1">{document.judul}</p>
          <p className="text-xs text-slate-600">
            Vendor: <strong>{document.vendor}</strong> • Versi Saat Ini: <strong>v{document.versi}</strong>
          </p>
          <p className="text-[11px] text-emerald-700 font-medium mt-1">
            Versi lama tetap tersimpan aman di tab DocumentVersions & Drive.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Pilih Berkas Revisi Baru <span className="text-rose-500">*</span>
          </label>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.docx,.doc,.xlsx,.xls,.jpg,.jpeg,.png"
            className="hidden"
            id="upload-version-input"
          />
          <label
            htmlFor="upload-version-input"
            className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
              selectedFile
                ? 'border-emerald-400 bg-emerald-50/50'
                : 'border-slate-200 bg-slate-50 hover:bg-slate-100/70 hover:border-slate-300'
            }`}
          >
            {selectedFile ? (
              <div className="flex items-center gap-3 text-slate-700">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <File className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-xs text-slate-800 line-clamp-1">{selectedFile.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Klik untuk ganti
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <UploadCloud className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-medium text-slate-700">
                  Pilih berkas revisi baru
                </p>
                <p className="text-[11px] text-slate-400">
                  PDF, DOCX, XLSX, JPG, PNG (Maksimal {maxFileSizeMb} MB)
                </p>
              </div>
            )}
          </label>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Catatan Perubahan Versi Baru (Opsional)
          </label>
          <textarea
            rows={2}
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Keterangan perbaikan pada versi ini (misal: penambahan lampiran sertifikat teknisi)..."
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
                <span>Mengunggah Versi Baru...</span>
              </>
            ) : (
              <span>Unggah Versi {nextVersion}</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
