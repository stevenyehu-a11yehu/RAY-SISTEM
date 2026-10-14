import React from 'react';
import {
  DocumentRecord,
  KpiSummary,
  AppSettings,
} from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  Clock,
  AlertTriangle,
  FileSignature,
  CheckCircle2,
  Calendar,
  Plus,
  Send,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  FileText,
  AlertCircle,
} from 'lucide-react';

interface Props {
  kpi: KpiSummary | null;
  documents: DocumentRecord[];
  settings: AppSettings | null;
  onNavigateToDocuments: (statusFilter?: string) => void;
  onOpenUpload: () => void;
  onSelectDocument: (doc: DocumentRecord) => void;
  onTriggerSendWhatsApp: (doc: DocumentRecord) => void;
}

export const DashboardPage: React.FC<Props> = ({
  kpi,
  documents,
  settings,
  onNavigateToDocuments,
  onOpenUpload,
  onSelectDocument,
  onTriggerSendWhatsApp,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const nowDate = new Date(todayStr);

  // Cari dokumen yang perlu perhatian khusus terkait deadline
  const urgentDocs = documents
    .filter((d) => d.status !== 'Selesai' && d.deadline)
    .map((d) => {
      const dDate = new Date(d.deadline);
      const diffDays = Math.round((dDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24));
      return { ...d, diffDays };
    })
    .sort((a, b) => a.diffDays - b.diffDays)
    .slice(0, 6);

  // 5 Dokumen terbaru
  const recentDocs = [...documents].slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Welcome & Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-800 to-teal-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="space-y-1 relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-emerald-200 text-xs font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            Monitoring Formulir Vendor Real-Time
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            Dashboard Pelacakan Dokumen Vendor
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/80 max-w-2xl">
            Pantau status verifikasi berkas formulir rekanan dan kelola pengingat otomatis via WhatsApp Fonnte.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10 shrink-0">
          <button
            onClick={onOpenUpload}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-emerald-900 hover:bg-emerald-50 rounded-2xl font-bold text-xs sm:text-sm shadow-lg transition-transform active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-700" />
            <span>Unggah Formulir</span>
          </button>
        </div>

        {/* Decorative elements */}
        <div className="absolute -right-8 -bottom-10 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* On Going */}
        <div
          onClick={() => onNavigateToDocuments('On Going')}
          className="bg-white p-5 rounded-2xl border border-blue-100 shadow-xs hover:shadow-md transition-all cursor-pointer group hover:border-blue-300"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              On Going
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-blue-900 mt-2">
            {kpi?.onGoing ?? 0}
          </p>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Dalam proses pengerjaan</span>
            <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </p>
        </div>

        {/* Perlu Direvisi */}
        <div
          onClick={() => onNavigateToDocuments('Perlu Direvisi')}
          className="bg-white p-5 rounded-2xl border border-amber-100 shadow-xs hover:shadow-md transition-all cursor-pointer group hover:border-amber-300"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Perlu Direvisi
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-amber-900 mt-2">
            {kpi?.perluDirevisi ?? 0}
          </p>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Menunggu perbaikan vendor</span>
            <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </p>
        </div>

        {/* Perlu Ditandatangani */}
        <div
          onClick={() => onNavigateToDocuments('Perlu Ditandatangani')}
          className="bg-white p-5 rounded-2xl border border-purple-100 shadow-xs hover:shadow-md transition-all cursor-pointer group hover:border-purple-300"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tanda Tangan
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileSignature className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-purple-900 mt-2">
            {kpi?.perluDitandatangani ?? 0}
          </p>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Menunggu tanda tangan PIC</span>
            <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </p>
        </div>

        {/* Selesai */}
        <div
          onClick={() => onNavigateToDocuments('Selesai')}
          className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-xs hover:shadow-md transition-all cursor-pointer group hover:border-emerald-300"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Selesai
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-900 mt-2">
            {kpi?.selesai ?? 0}
          </p>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Selesai & pengingat berhenti</span>
            <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </p>
        </div>
      </div>

      {/* Grid: Dokumen Mendesak (Deadline) & Aktivitas Terakhir */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri: Dokumen Mendekati atau Melewati Deadline (2 span) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Perhatian Batas Waktu (Deadline)
                </h3>
                <p className="text-xs text-slate-500">
                  Dokumen yang mendekati atau telah melampaui tanggal target
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigateToDocuments()}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 cursor-pointer"
            >
              Lihat Semua
            </button>
          </div>

          {urgentDocs.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              Tidak ada dokumen mendesak saat ini. Semua dokumen dalam jadwal aman.
            </div>
          ) : (
            <div className="space-y-2.5">
              {urgentDocs.map((doc) => {
                const isOverdue = doc.diffDays < 0;
                const isToday = doc.diffDays === 0;

                return (
                  <div
                    key={doc.id}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isOverdue
                        ? 'bg-rose-50/60 border-rose-200'
                        : isToday
                        ? 'bg-amber-50/70 border-amber-200'
                        : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/60'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge status={doc.status} size="sm" />
                        {isOverdue ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                            Terlewat {Math.abs(doc.diffDays)} hari
                          </span>
                        ) : isToday ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            Hari-H Terakhir!
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                            Sisa {doc.diffDays} hari lagi
                          </span>
                        )}
                        <span className="text-xs font-semibold text-slate-700">
                          {doc.vendor}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 line-clamp-1">{doc.judul}</p>
                      <p className="text-[11px] text-slate-500">
                        Batas Waktu: <strong>{doc.deadline}</strong> • Versi: v{doc.versi}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        onClick={() => onTriggerSendWhatsApp(doc)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        title="Kirim pengingat WhatsApp sekarang"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Kirim WA</span>
                      </button>
                      <button
                        onClick={() => onSelectDocument(doc)}
                        className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                      >
                        Detail
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Kolom Kanan: 5 Dokumen Terbaru & Ringkasan */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Dokumen Terbaru</h3>
            </div>
          </div>

          <div className="space-y-3">
            {recentDocs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => onSelectDocument(doc)}
                className="p-3 rounded-2xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/80 transition-all cursor-pointer space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 truncate max-w-[180px]">
                    {doc.vendor}
                  </span>
                  <StatusBadge status={doc.status} size="sm" showIcon={false} />
                </div>
                <p className="text-xs text-slate-800 font-medium line-clamp-1">{doc.judul}</p>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>v{doc.versi}</span>
                  <span>{new Date(doc.dibuat_pada).toLocaleDateString('id-ID')}</span>
                </div>
              </div>
            ))}

            {recentDocs.length === 0 && (
              <p className="text-center text-xs text-slate-400 py-6">
                Belum ada dokumen yang diunggah.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
