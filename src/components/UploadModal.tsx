import React, { useState, useRef } from 'react';
import { Modal } from './Modal';
import { api } from '../api';
import { UploadCloud, File, AlertCircle, Loader2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  maxFileSizeMb?: number;
}

export const UploadModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  maxFileSizeMb = 10,
}) => {
  const [vendor, setVendor] = useState('');
  const [waVendor, setWaVendor] = useState('');
  const [judul, setJudul] = useState('');
  const [deadline, setDeadline] = useState('');
  const [catatan, setCatatan] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setVendor('');
    setWaVendor('');
    setJudul('');
    setDeadline('');
    setCatatan('');
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validasi ukuran
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
    if (!vendor.trim()) {
      setError('Nama vendor wajib diisi.');
      return;
    }
    if (!judul.trim()) {
      setError('Judul atau jenis formulir wajib diisi.');
      return;
    }
    if (!selectedFile) {
      setError('Berkas formulir wajib dilampirkan.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('vendor', vendor.trim());
      formData.append('wa_vendor', waVendor.trim());
      formData.append('judul', judul.trim());
      if (deadline) formData.append('deadline', deadline);
      if (catatan) formData.append('catatan', catatan.trim());
      formData.append('file', selectedFile);

      await api.createDocument(formData);
      resetForm();
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal mengunggah dokumen.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Unggah Formulir Dokumen Vendor" maxWidth="xl">
      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Vendor <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="Contoh: PT Sumber Makmur"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nomor WhatsApp PIC Vendor (Opsional)
            </label>
            <input
              type="text"
              value={waVendor}
              onChange={(e) => setWaVendor(e.target.value)}
              placeholder="Contoh: 081298765432"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            <p className="text-[11px] text-slate-400 mt-0.5">Otomatis diformat ke kode negara 62.</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Judul / Jenis Formulir <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={judul}
            onChange={(e) => setJudul(e.target.value)}
            placeholder="Contoh: Formulir Verifikasi Vendor & Pakta Integritas"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Batas Waktu (Deadline Target)
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-700"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Status Awal
            </label>
            <div className="px-3 py-2 bg-blue-50 border border-blue-200 text-blue-700 font-medium rounded-xl text-xs flex items-center justify-between">
              <span>On Going</span>
              <span className="text-[10px] text-blue-500 uppercase tracking-wider font-semibold">
                Status Default
              </span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Catatan Dokumen (Opsional)
          </label>
          <textarea
            rows={2}
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Keterangan tambahan kelengkapan dokumen..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        {/* File Picker Zone */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Unggah Berkas <span className="text-rose-500">*</span>
          </label>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.docx,.doc,.xlsx,.xls,.jpg,.jpeg,.png"
            className="hidden"
            id="upload-file-input"
          />

          <label
            htmlFor="upload-file-input"
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
                  Pilih atau seret berkas ke sini
                </p>
                <p className="text-[11px] text-slate-400">
                  PDF, DOCX, XLSX, JPG, PNG (Maksimal {maxFileSizeMb} MB)
                </p>
              </div>
            )}
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-medium text-xs transition-colors cursor-pointer"
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
                <span>Mengunggah ke Drive & Sheets...</span>
              </>
            ) : (
              <span>Simpan Dokumen</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
