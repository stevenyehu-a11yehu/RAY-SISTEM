import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { DocumentRecord, AppSettings } from '../types';
import { api } from '../api';
import { Send, AlertCircle, Loader2, MessageSquare, CheckCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentRecord | null;
  settings: AppSettings | null;
  onSuccess: () => void;
}

export const SendWhatsAppModal: React.FC<Props> = ({
  isOpen,
  onClose,
  document,
  settings,
  onSuccess,
}) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  useEffect(() => {
    if (document) {
      // Hitung hari berjalan
      const created = new Date(document.dibuat_pada);
      const now = new Date();
      const hariBerjalan = Math.max(
        1,
        Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)) + 1
      );

      // Default template pesan berdasarkan status
      let defaultMsg = `Halo *${document.vendor}*, formulir *${document.judul}* saat ini berstatus *${document.status}* (hari ke-${hariBerjalan}).`;
      if (document.deadline) {
        defaultMsg += `\nBatas Waktu: ${document.deadline}`;
      }
      if (document.catatan) {
        defaultMsg += `\nCatatan: ${document.catatan}`;
      }
      defaultMsg += `\nTautan Berkas: ${document.drive_url}\n\nTerima kasih.`;

      setMessage(defaultMsg);
      setError(null);
      setSuccessInfo(null);
    }
  }, [document]);

  if (!document) return null;

  const handleSend = async () => {
    if (!message.trim()) {
      setError('Pesan WhatsApp tidak boleh kosong.');
      return;
    }

    setIsSending(true);
    setError(null);
    setSuccessInfo(null);

    try {
      const res = await api.sendNowWhatsApp(document.id, message);
      setSuccessInfo(res.message);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim pesan WhatsApp.');
    } finally {
      setIsSending(false);
    }
  };

  const recipientMode = settings?.recipient_target || 'both';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Kirim Pengingat WhatsApp Sekarang" maxWidth="lg">
      <div className="space-y-4 text-sm">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successInfo && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{successInfo}</span>
          </div>
        )}

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Dokumen:</span>
            <span className="font-bold text-slate-800">{document.judul}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Vendor PIC:</span>
            <span className="font-semibold text-slate-700">
              {document.vendor} ({document.wa_vendor || 'Tidak ada nomor'})
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Target Pengiriman:</span>
            <span className="px-2 py-0.5 bg-slate-200/70 text-slate-800 rounded font-medium">
              {recipientMode === 'both'
                ? 'Vendor & Nomor Default Saya'
                : recipientMode === 'vendor'
                ? 'Hanya Vendor PIC'
                : 'Hanya Nomor Default Saya'}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
              Pesan WhatsApp yang Akan Dikirim:
            </span>
            <span className="text-[11px] text-slate-400 font-normal">Dapat disunting sebelum kirim</span>
          </label>
          <textarea
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-xs text-slate-800 leading-relaxed"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            Pengiriman langsung diproses lewat API Fonnte dan dicatat ke log pengiriman.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-medium text-xs cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={isSending || Boolean(successInfo)}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-xs shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Mengirim WhatsApp...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Kirim WhatsApp Sekarang</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
