import React, { useState } from 'react';
import { DocumentRecord, DocumentStatus } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  Search,
  Filter,
  ArrowUpDown,
  ExternalLink,
  Eye,
  Send,
  Trash2,
  Edit3,
  Calendar,
  Phone,
  FileText,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react';

interface Props {
  documents: DocumentRecord[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  vendorFilter: string;
  setVendorFilter: (v: string) => void;
  sortBy: string;
  setSortBy: (s: string) => void;
  vendorList: string[];
  onOpenUpload: () => void;
  onSelectDocument: (doc: DocumentRecord) => void;
  onChangeStatus: (doc: DocumentRecord) => void;
  onTriggerSendWhatsApp: (doc: DocumentRecord) => void;
  onDeleteDocument: (doc: DocumentRecord) => void;
}

export const DocumentListPage: React.FC<Props> = ({
  documents,
  totalItems,
  totalPages,
  currentPage,
  onPageChange,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  vendorFilter,
  setVendorFilter,
  sortBy,
  setSortBy,
  vendorList,
  onOpenUpload,
  onSelectDocument,
  onChangeStatus,
  onTriggerSendWhatsApp,
  onDeleteDocument,
}) => {
  const statuses = ['Semua', 'On Going', 'Perlu Direvisi', 'Perlu Ditandatangani', 'Selesai'];

  const todayStr = new Date().toISOString().split('T')[0];
  const nowDate = new Date(todayStr);

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">
            Daftar Dokumen Formulir Vendor
          </h1>
          <p className="text-xs text-slate-500">
            Total {totalItems} dokumen aktif tersimpan di Google Sheets & Google Drive
          </p>
        </div>

        <button
          onClick={onOpenUpload}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Unggah Formulir Baru</span>
        </button>
      </div>

      {/* Filter Tabs & Search Control Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {statuses.map((st) => {
            const isActive = statusFilter === st;
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            );
          })}
        </div>

        {/* Search, Vendor, and Sort Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-slate-100">
          {/* Search Input */}
          <div className="sm:col-span-5 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari vendor, judul formulir, atau catatan..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Filter Vendor Dropdown */}
          <div className="sm:col-span-4">
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-700"
            >
              <option value="Semua">Semua Vendor ({vendorList.length})</option>
              {vendorList.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="sm:col-span-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-700"
            >
              <option value="terbaru">Terbaru Ditambahkan</option>
              <option value="terlama">Terlama</option>
              <option value="deadline_asc">Deadline Terdekat</option>
              <option value="deadline_desc">Deadline Terjauh</option>
              <option value="vendor_asc">Nama Vendor (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Dokumen Table (Desktop) & Cards (Mobile) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {documents.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">Tidak ada dokumen ditemukan</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Coba sesuaikan kata kunci pencarian atau filter status yang dipilih.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-100 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-5 py-3.5">Vendor & Kontak</th>
                    <th className="px-4 py-3.5">Judul Formulir</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-3 py-3.5 text-center">Versi</th>
                    <th className="px-4 py-3.5">Batas Waktu</th>
                    <th className="px-5 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {documents.map((doc) => {
                    let deadlineBadge = null;
                    if (doc.deadline && doc.status !== 'Selesai') {
                      const dDate = new Date(doc.deadline);
                      const diffDays = Math.round((dDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24));
                      if (diffDays < 0) {
                        deadlineBadge = (
                          <span className="text-[10px] text-rose-600 font-semibold block">
                            Terlewat {Math.abs(diffDays)} hari
                          </span>
                        );
                      } else if (diffDays <= 3) {
                        deadlineBadge = (
                          <span className="text-[10px] text-amber-600 font-semibold block">
                            Sisa {diffDays} hari lagi
                          </span>
                        );
                      }
                    }

                    return (
                      <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-slate-900">
                          <p className="font-bold text-slate-900">{doc.vendor}</p>
                          {doc.wa_vendor ? (
                            <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {doc.wa_vendor}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Tanpa WA PIC</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 max-w-xs">
                          <p className="font-semibold text-slate-800 line-clamp-1">{doc.judul}</p>
                          {doc.catatan && (
                            <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                              {doc.catatan}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <StatusBadge status={doc.status} size="sm" />
                        </td>

                        <td className="px-3 py-3.5 text-center whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[11px]">
                            v{doc.versi}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {doc.deadline ? (
                            <div>
                              <span className="text-slate-800 font-medium">{doc.deadline}</span>
                              {deadlineBadge}
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Drive Link */}
                            {doc.drive_url && (
                              <a
                                href={doc.drive_url}
                                target="_blank"
                                rel="noreferrer"
                                title="Buka berkas di Google Drive"
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}

                            {/* Kirim WhatsApp Sekarang */}
                            <button
                              onClick={() => onTriggerSendWhatsApp(doc)}
                              title="Kirim pengingat WhatsApp sekarang"
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Send className="w-4 h-4" />
                            </button>

                            {/* Ganti Status */}
                            <button
                              onClick={() => onChangeStatus(doc)}
                              title="Ganti status dokumen"
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            {/* Detail */}
                            <button
                              onClick={() => onSelectDocument(doc)}
                              title="Lihat detail & riwayat dokumen"
                              className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Hapus */}
                            <button
                              onClick={() => onDeleteDocument(doc)}
                              title="Hapus dokumen (soft delete)"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="block md:hidden divide-y divide-slate-100 p-3 space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="pt-3 first:pt-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{doc.vendor}</span>
                    <StatusBadge status={doc.status} size="sm" />
                  </div>

                  <p className="text-xs font-semibold text-slate-800">{doc.judul}</p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Versi: v{doc.versi}</span>
                    <span>Deadline: {doc.deadline || '-'}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-50">
                    {doc.drive_url ? (
                      <a
                        href={doc.drive_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-medium text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Berkas Drive</span>
                      </a>
                    ) : (
                      <span />
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onTriggerSendWhatsApp(doc)}
                        className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-semibold rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        <span>WA</span>
                      </button>
                      <button
                        onClick={() => onChangeStatus(doc)}
                        className="px-2.5 py-1 bg-amber-50 text-amber-700 font-semibold rounded-lg text-xs cursor-pointer"
                      >
                        Status
                      </button>
                      <button
                        onClick={() => onSelectDocument(doc)}
                        className="px-2.5 py-1 bg-slate-100 text-slate-700 font-semibold rounded-lg text-xs cursor-pointer"
                      >
                        Detail
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Halaman {currentPage} dari {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
