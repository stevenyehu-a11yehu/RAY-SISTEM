import React, { useState, useEffect } from 'react';
import { ReminderLogRecord } from '../types';
import { api } from '../api';
import {
  BellRing,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  Phone,
  FileText,
  Loader2,
} from 'lucide-react';

export const DeliveryLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<ReminderLogRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<ReminderLogRecord | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await api.getLogs({
        status: statusFilter,
        q: searchQuery,
        limit: 150,
      });
      setLogs(res.data);
    } catch (err: any) {
      console.error('Error fetching logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">
            Log Pengiriman Notifikasi WhatsApp
          </h1>
          <p className="text-xs text-slate-500">
            Riwayat pesan yang dikirim oleh scheduler atau pemicu manual beserta status respons API Fonnte.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Muat Ulang Log</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          {['Semua', 'berhasil', 'gagal'].map((st) => {
            const isActive = statusFilter === st;
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl font-semibold capitalize transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="w-full sm:w-80 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nomor tujuan, pesan, atau aturan..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
        </form>
      </div>

      {/* Logs Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center space-y-2">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Memuat log pengiriman dari Google Sheets...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <BellRing className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">Belum ada riwayat pengiriman</p>
            <p className="text-xs text-slate-400">
              Log akan muncul ketika scheduler atau pemicu manual mengirim pesan WhatsApp.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-100 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">Waktu Kirim</th>
                  <th className="px-4 py-3.5">Nomor Tujuan</th>
                  <th className="px-4 py-3.5">Aturan / Jenis</th>
                  <th className="px-4 py-3.5">Isi Pesan</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Respons Fonnte</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {logs.map((log) => {
                  const isSuccess = log.status_kirim === 'berhasil';

                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3.5 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {new Date(log.waktu_kirim).toLocaleString('id-ID')}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap font-medium text-slate-900">
                        <span className="font-mono">{log.tujuan}</span>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[10px] font-semibold">
                          {log.rule_key}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 max-w-xs">
                        <p className="line-clamp-2 text-slate-700">{log.pesan}</p>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            isSuccess
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isSuccess ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5" />
                          )}
                          <span className="capitalize">{log.status_kirim}</span>
                        </span>
                      </td>

                      <td className="px-5 py-3.5 max-w-xs text-slate-500 font-mono text-[11px] truncate">
                        {log.respons_fonnte}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Detail Log */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 text-xs shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">Detail Riwayat Pengiriman</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Waktu:</span>
                <span className="font-semibold text-slate-800">
                  {new Date(selectedLog.waktu_kirim).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Nomor Tujuan:</span>
                <span className="font-mono font-bold text-slate-800">{selectedLog.tujuan}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Aturan:</span>
                <span className="font-mono text-emerald-700 font-semibold">{selectedLog.rule_key}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Status Pengiriman:</span>
                <span className="font-bold capitalize text-slate-800">{selectedLog.status_kirim}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="font-semibold text-slate-700 block">Pesan yang Dikirim:</span>
              <div className="p-3 bg-slate-50 rounded-xl font-mono text-[11px] text-slate-800 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                {selectedLog.pesan}
              </div>
            </div>

            <div className="space-y-1">
              <span className="font-semibold text-slate-700 block">Respons Raw Fonnte:</span>
              <div className="p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] whitespace-pre-wrap max-h-28 overflow-y-auto">
                {selectedLog.respons_fonnte}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
