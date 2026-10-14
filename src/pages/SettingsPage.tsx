import React, { useState, useEffect } from 'react';
import { AppSettings, ReminderRuleRecord, DocumentStatus } from '../types';
import { api } from '../api';
import {
  Save,
  CheckCircle,
  AlertCircle,
  Clock,
  Send,
  Sliders,
  Shield,
  Folder,
  HardDrive,
  Globe,
  Loader2,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';

interface Props {
  initialSettings: AppSettings | null;
  initialRules: ReminderRuleRecord[];
  onSaved: () => void;
}

export const SettingsPage: React.FC<Props> = ({
  initialSettings,
  initialRules,
  onSaved,
}) => {
  const [activeTab, setActiveTab] = useState<'gateway' | 'rules' | 'deadline' | 'storage' | 'sandbox'>('gateway');

  // Form states
  const [fonnteToken, setFonnteToken] = useState('');
  const [changeTokenMode, setChangeTokenMode] = useState(false);
  const [defaultWaNumber, setDefaultWaNumber] = useState('');
  const [recipientTarget, setRecipientTarget] = useState<'self' | 'vendor' | 'both'>('both');
  const [driveFolderId, setDriveFolderId] = useState('');
  const [maxFileSizeMb, setMaxFileSizeMb] = useState<number>(10);
  const [timezone, setTimezone] = useState('Asia/Jakarta');

  // Deadline rules
  const [deadlineH7Active, setDeadlineH7Active] = useState(true);
  const [deadlineH3Active, setDeadlineH3Active] = useState(true);
  const [deadlineH1Active, setDeadlineH1Active] = useState(true);
  const [deadlineH0Active, setDeadlineH0Active] = useState(true);
  const [deadlineH7Template, setDeadlineH7Template] = useState('');
  const [deadlineH3Template, setDeadlineH3Template] = useState('');
  const [deadlineH1Template, setDeadlineH1Template] = useState('');
  const [deadlineH0Template, setDeadlineH0Template] = useState('');

  // Status rules
  const [rules, setRules] = useState<ReminderRuleRecord[]>([]);

  // Sandbox Test Send State
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Halo! Ini adalah pesan uji coba integrasi WhatsApp Fonnte untuk sistem Vendor Tracker.');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // General save state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (initialSettings) {
      setDefaultWaNumber(initialSettings.default_wa_number || '');
      setRecipientTarget(initialSettings.recipient_target || 'both');
      setDriveFolderId(initialSettings.drive_folder_id || '');
      setMaxFileSizeMb(initialSettings.max_file_size_mb || 10);
      setTimezone(initialSettings.timezone || 'Asia/Jakarta');

      setDeadlineH7Active(initialSettings.deadline_h7_active);
      setDeadlineH3Active(initialSettings.deadline_h3_active);
      setDeadlineH1Active(initialSettings.deadline_h1_active);
      setDeadlineH0Active(initialSettings.deadline_h0_active);
      setDeadlineH7Template(initialSettings.deadline_h7_template || '');
      setDeadlineH3Template(initialSettings.deadline_h3_template || '');
      setDeadlineH1Template(initialSettings.deadline_h1_template || '');
      setDeadlineH0Template(initialSettings.deadline_h0_template || '');

      if (!testPhone && initialSettings.default_wa_number) {
        setTestPhone(initialSettings.default_wa_number);
      }
    }

    if (initialRules && initialRules.length > 0) {
      setRules(initialRules);
    }
  }, [initialSettings, initialRules]);

  const handleDayToggle = (ruleIndex: number, dayNum: number) => {
    const updated = [...rules];
    const currentDays = updated[ruleIndex].hari
      ? updated[ruleIndex].hari.split(',').map((h) => parseInt(h.trim(), 10)).filter(Boolean)
      : [];

    let newDays: number[];
    if (currentDays.includes(dayNum)) {
      newDays = currentDays.filter((d) => d !== dayNum);
    } else {
      newDays = [...currentDays, dayNum].sort();
    }

    updated[ruleIndex].hari = newDays.join(',');
    setRules(updated);
  };

  const handleRuleChange = (ruleIndex: number, field: keyof ReminderRuleRecord, value: any) => {
    const updated = [...rules];
    updated[ruleIndex] = { ...updated[ruleIndex], [field]: value };
    setRules(updated);
  };

  const insertPlaceholder = (ruleIndex: number, placeholder: string) => {
    const updated = [...rules];
    updated[ruleIndex].template = (updated[ruleIndex].template || '') + ` ${placeholder}`;
    setRules(updated);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccessMessage(null);
    setSaveError(null);

    try {
      const settingsPayload: Partial<AppSettings> = {
        default_wa_number: defaultWaNumber.trim(),
        recipient_target: recipientTarget,
        drive_folder_id: driveFolderId.trim(),
        max_file_size_mb: Number(maxFileSizeMb),
        timezone,
        deadline_h7_active: deadlineH7Active,
        deadline_h3_active: deadlineH3Active,
        deadline_h1_active: deadlineH1Active,
        deadline_h0_active: deadlineH0Active,
        deadline_h7_template: deadlineH7Template,
        deadline_h3_template: deadlineH3Template,
        deadline_h1_template: deadlineH1Template,
        deadline_h0_template: deadlineH0Template,
      };

      if (changeTokenMode && fonnteToken.trim()) {
        settingsPayload.fonnte_token = fonnteToken.trim();
      }

      const res = await api.updateSettings({
        settings: settingsPayload,
        reminderRules: rules,
      });

      setSaveSuccessMessage(res.message);
      setChangeTokenMode(false);
      setFonnteToken('');
      onSaved();
    } catch (err: any) {
      setSaveError(err.message || 'Gagal menyimpan pengaturan.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunTestSend = async () => {
    if (!testPhone.trim() || !testMessage.trim()) {
      setTestResult({ success: false, message: 'Nomor telepon dan pesan tes wajib diisi.' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await api.testSendWhatsApp(testPhone.trim(), testMessage.trim());
      setTestResult({ success: true, message: res.message });
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Gagal mengirim pesan uji coba.' });
    } finally {
      setIsTesting(false);
    }
  };

  const dayNames = [
    { num: 1, label: 'Sen' },
    { num: 2, label: 'Sel' },
    { num: 3, label: 'Rab' },
    { num: 4, label: 'Kam' },
    { num: 5, label: 'Jum' },
    { num: 6, label: 'Sab' },
    { num: 7, label: 'Min' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">
            Pengaturan Sistem & Aturan Pengingat WhatsApp
          </h1>
          <p className="text-xs text-slate-500">
            Semua konfigurasi tersimpan di Google Sheets (tab Settings & ReminderRules) dan langsung berlaku.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs hover:shadow transition-all cursor-pointer disabled:opacity-50 self-start sm:self-auto"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Menyimpan ke Sheets...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Simpan Perubahan</span>
            </>
          )}
        </button>
      </div>

      {saveSuccessMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMessage}</span>
        </div>
      )}

      {saveError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'gateway', label: 'Gateway WhatsApp', icon: Sliders },
          { id: 'rules', label: 'Jadwal per Status', icon: Clock },
          { id: 'deadline', label: 'Pengingat Deadline', icon: AlertCircle },
          { id: 'storage', label: 'Penyimpanan & Kuota', icon: HardDrive },
          { id: 'sandbox', label: 'Uji Coba Kirim (Sandbox)', icon: Send },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 border-b-2 font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: GATEWAY WHATSAPP */}
      {activeTab === 'gateway' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
          <div>
            <h3 className="text-base font-bold text-slate-800">Konfigurasi Gateway Fonnte</h3>
            <p className="text-xs text-slate-500">
              Koneksi ke API Fonnte untuk pengiriman otomatis pesan WhatsApp tanpa instalasi server WhatsApp lokal.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            {/* Token Fonnte */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">
                Token API Fonnte
              </label>
              {!changeTokenMode ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-mono text-slate-600">
                    {initialSettings?.has_fonnte_token
                      ? initialSettings.fonnte_token_masked
                      : 'Belum diisi (Simulasi Pengiriman Aktif)'}
                  </div>
                  <button
                    type="button"
                    onClick={() => setChangeTokenMode(true)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-semibold cursor-pointer"
                  >
                    Ubah Token
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <input
                    type="password"
                    value={fonnteToken}
                    onChange={(e) => setFonnteToken(e.target.value)}
                    placeholder="Masukkan token Fonnte baru..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setChangeTokenMode(false)}
                    className="text-[11px] text-slate-500 hover:underline cursor-pointer"
                  >
                    Batalkan ubah token
                  </button>
                </div>
              )}
              <p className="text-[11px] text-slate-400">
                Ambil token dari dashboard Fonnte (https://fonnte.com). Disimpan aman dan tidak diekspos ke publik.
              </p>
            </div>

            {/* Nomor Default */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">
                Nomor WhatsApp Saya (PIC Internal Default)
              </label>
              <input
                type="text"
                value={defaultWaNumber}
                onChange={(e) => setDefaultWaNumber(e.target.value)}
                placeholder="Contoh: 081234567890 (otomatis ke 6281234567890)"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              <p className="text-[11px] text-slate-400">
                Nomor Anda yang akan menerima salinan notifikasi reminder dokumen rekanan.
              </p>
            </div>

            {/* Opsi Penerima */}
            <div className="space-y-1 md:col-span-2">
              <label className="font-semibold text-slate-700 block">
                Target Penerima Pengingat WhatsApp
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'both', label: 'Kirim ke Keduanya', desc: 'PIC Internal + Vendor PIC' },
                  { id: 'vendor', label: 'Hanya ke Vendor', desc: 'Hanya dikirim ke nomor PIC Vendor' },
                  { id: 'self', label: 'Hanya ke Saya', desc: 'Hanya dikirim ke nomor PIC Internal' },
                ].map((opt) => (
                  <label
                    key={opt.id}
                    onClick={() => setRecipientTarget(opt.id as any)}
                    className={`p-3.5 rounded-2xl border flex flex-col justify-between cursor-pointer transition-all ${
                      recipientTarget === opt.id
                        ? 'border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-600'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-bold text-slate-800">{opt.label}</span>
                    <span className="text-[11px] text-slate-500 mt-1">{opt.desc}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: JADWAL & ATURAN PENGINGAT PER STATUS */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-2xl text-xs text-blue-900 leading-relaxed">
            <strong>Cara Kerja Scheduler:</strong> Scheduler berjalan tiap menit di latar belakang, membaca aturan di bawah langsung dari Google Sheets. Pengiriman dilakukan tepat pada jam & hari yang dipilih jika interval hari terpenuhi. Sistem otomatis mencegah pengiriman ganda pada hari yang sama (idempotent).
          </div>

          <div className="space-y-4">
            {rules.map((rule, idx) => {
              const currentDays = rule.hari
                ? rule.hari.split(',').map((h) => parseInt(h.trim(), 10))
                : [];

              return (
                <div
                  key={rule.status}
                  className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4 text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-slate-800">
                        Aturan Status: {rule.status}
                      </span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rule.aktif}
                          onChange={(e) => handleRuleChange(idx, 'aktif', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                        <span className="ml-2 text-xs font-semibold text-slate-600">
                          {rule.aktif ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </label>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 font-medium">Jam Kirim:</span>
                        <input
                          type="time"
                          value={rule.jam}
                          onChange={(e) => handleRuleChange(idx, 'jam', e.target.value)}
                          className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg font-mono font-semibold"
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 font-medium">Interval:</span>
                        <select
                          value={rule.interval_hari}
                          onChange={(e) =>
                            handleRuleChange(idx, 'interval_hari', parseInt(e.target.value, 10))
                          }
                          className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                        >
                          <option value={1}>Setiap Hari</option>
                          <option value={2}>Setiap 2 Hari</option>
                          <option value={3}>Setiap 3 Hari</option>
                          <option value={7}>Setiap 7 Hari (Mingguan)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Hari kirim */}
                  <div>
                    <span className="text-slate-500 font-medium block mb-1.5">
                      Hari Pengiriman Aktif:
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {dayNames.map((d) => {
                        const isChecked = currentDays.includes(d.num);
                        return (
                          <button
                            type="button"
                            key={d.num}
                            onClick={() => handleDayToggle(idx, d.num)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              isChecked
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Template Pesan */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-slate-700 font-semibold">
                        Template Pesan WhatsApp:
                      </span>
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-[10px] text-slate-400 mr-1">Klik placeholder:</span>
                        {['{vendor}', '{judul}', '{status}', '{deadline}', '{link}', '{hari_berjalan}'].map(
                          (ph) => (
                            <button
                              type="button"
                              key={ph}
                              onClick={() => insertPlaceholder(idx, ph)}
                              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-mono cursor-pointer"
                            >
                              {ph}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                    <textarea
                      rows={3}
                      value={rule.template}
                      onChange={(e) => handleRuleChange(idx, 'template', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800 leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: PENGINGAT DEADLINE (H-7, H-3, H-1, HARI-H) */}
      {activeTab === 'deadline' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6 text-xs">
          <div>
            <h3 className="text-base font-bold text-slate-800">Aturan Pengingat Batas Waktu (Deadline)</h3>
            <p className="text-xs text-slate-500">
              Pengingat otomatis dievaluasi setiap pagi (08:30 WIB) berdasarkan sisa hari menuju deadline target formulir.
            </p>
          </div>

          <div className="space-y-4">
            {/* H-7 */}
            <div className="p-4 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Pengingat H-7 (7 Hari Sebelum Batas Waktu)</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deadlineH7Active}
                    onChange={(e) => setDeadlineH7Active(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-emerald-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                </label>
              </div>
              <textarea
                rows={2}
                value={deadlineH7Template}
                onChange={(e) => setDeadlineH7Template(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-mono text-xs"
              />
            </div>

            {/* H-3 */}
            <div className="p-4 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Pengingat H-3 (3 Hari Sebelum Batas Waktu)</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deadlineH3Active}
                    onChange={(e) => setDeadlineH3Active(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-emerald-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                </label>
              </div>
              <textarea
                rows={2}
                value={deadlineH3Template}
                onChange={(e) => setDeadlineH3Template(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-mono text-xs"
              />
            </div>

            {/* H-1 */}
            <div className="p-4 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Pengingat H-1 (H-1 Terakhir Menjelang Batas Waktu)</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deadlineH1Active}
                    onChange={(e) => setDeadlineH1Active(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-emerald-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                </label>
              </div>
              <textarea
                rows={2}
                value={deadlineH1Template}
                onChange={(e) => setDeadlineH1Template(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-mono text-xs"
              />
            </div>

            {/* Hari-H */}
            <div className="p-4 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Pengingat Hari-H (Jatuh Tempo Hari Ini)</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deadlineH0Active}
                    onChange={(e) => setDeadlineH0Active(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-emerald-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                </label>
              </div>
              <textarea
                rows={2}
                value={deadlineH0Template}
                onChange={(e) => setDeadlineH0Template(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-mono text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PENYIMPANAN & SISTEM */}
      {activeTab === 'storage' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5 text-xs">
          <div>
            <h3 className="text-base font-bold text-slate-800">Penyimpanan Google Drive & Zona Waktu</h3>
            <p className="text-xs text-slate-500">
              Konfigurasi folder tujuan upload dan batas ukuran berkas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">
                Google Drive Folder ID
              </label>
              <input
                type="text"
                value={driveFolderId}
                onChange={(e) => setDriveFolderId(e.target.value)}
                placeholder="Contoh: 1_Vq7Y-1oWXYZ987654321abcdef"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
              />
              <p className="text-[11px] text-slate-400">
                Folder Google Drive tempat berkas vendor akan disimpan. Ambil dari URL folder Drive.
              </p>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">
                Batas Ukuran Berkas Maksimum (MB)
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={maxFileSizeMb}
                onChange={(e) => setMaxFileSizeMb(parseInt(e.target.value, 10) || 10)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              />
              <p className="text-[11px] text-slate-400">
                Default 10 MB (dapat disesuaikan hingga 50 MB sesuai kebutuhan).
              </p>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">
                Zona Waktu Server
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              >
                <option value="Asia/Jakarta">WIB - Asia/Jakarta (UTC+7)</option>
                <option value="Asia/Makassar">WITA - Asia/Makassar (UTC+8)</option>
                <option value="Asia/Jayapura">WIT - Asia/Jayapura (UTC+9)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SANDBOX TES KIRIM WHATSAPP */}
      {activeTab === 'sandbox' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5 text-xs">
          <div>
            <h3 className="text-base font-bold text-slate-800">Sandbox Uji Coba Kirim Pesan WhatsApp</h3>
            <p className="text-xs text-slate-500">
              Gunakan fitur ini untuk memverifikasi apakah Token Fonnte dan perangkat WhatsApp Anda sudah terhubung dan dapat mengirim pesan dengan sukses.
            </p>
          </div>

          {testResult && (
            <div
              className={`p-4 rounded-2xl border flex items-start gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              {testResult.success ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <span className="font-bold">
                  {testResult.success ? 'Berhasil Mengirim!' : 'Gagal Mengirim:'}
                </span>
                <p className="leading-relaxed">{testResult.message}</p>
              </div>
            </div>
          )}

          <div className="space-y-4 max-w-xl">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">
                Nomor WhatsApp Uji Coba:
              </label>
              <input
                type="text"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="Contoh: 081298765432"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">
                Pesan Uji Coba:
              </label>
              <textarea
                rows={3}
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-xs"
              />
            </div>

            <button
              type="button"
              onClick={handleRunTestSend}
              disabled={isTesting}
              className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white font-semibold rounded-xl flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengirim pesan tes via Fonnte...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Kirim Pesan Uji Coba Sekarang</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
