/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  DocumentRecord,
  UserProfile,
  GoogleConnectionStatus,
  AppSettings,
  ReminderRuleRecord,
  KpiSummary,
} from './types';
import { api } from './api';
import { Navbar } from './components/Navbar';
import { SimulationBanner } from './components/SimulationBanner';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { DocumentListPage } from './pages/DocumentListPage';
import { DocumentDetailPage } from './pages/DocumentDetailPage';
import { SettingsPage } from './pages/SettingsPage';
import { DeliveryLogsPage } from './pages/DeliveryLogsPage';
import { UploadModal } from './components/UploadModal';
import { ChangeStatusModal } from './components/ChangeStatusModal';
import { UploadVersionModal } from './components/UploadVersionModal';
import { SendWhatsAppModal } from './components/SendWhatsAppModal';
import { Loader2 } from 'lucide-react';

export default function App() {
  // Auth state
  const [user, setUser] = useState<UserProfile | null>(null);
  const [googleStatus, setGoogleStatus] = useState<GoogleConnectionStatus | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // App Navigation state
  const [activeTab, setActiveTab] = useState<'dashboard' | 'documents' | 'settings' | 'logs'>('dashboard');
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  // Documents and Settings data
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [kpi, setKpi] = useState<KpiSummary | null>(null);
  const [vendorList, setVendorList] = useState<string[]>([]);

  // Filters for Document List
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [vendorFilter, setVendorFilter] = useState('Semua');
  const [sortBy, setSortBy] = useState('terbaru');

  // App Settings & Reminder Rules
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [reminderRules, setReminderRules] = useState<ReminderRuleRecord[]>([]);

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [statusModalDoc, setStatusModalDoc] = useState<DocumentRecord | null>(null);
  const [versionModalDoc, setVersionModalDoc] = useState<DocumentRecord | null>(null);
  const [sendWhatsAppDoc, setSendWhatsAppDoc] = useState<DocumentRecord | null>(null);
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<DocumentRecord | null>(null);

  // Check auth on load
  const checkAuth = useCallback(async () => {
    try {
      const res = await api.getMe();
      setUser(res.user);
      setGoogleStatus(res.googleConnection);
    } catch {
      setUser(null);
    } finally {
      setIsInitializing(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Load Settings
  const loadSettings = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.getSettings();
      setSettings(res.data.settings);
      setReminderRules(res.data.reminderRules);
      setGoogleStatus(res.data.googleConnection);
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  }, [user]);

  // Load Documents
  const loadDocuments = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.getDocuments({
        q: searchQuery,
        status: statusFilter,
        vendor: vendorFilter,
        sort: sortBy,
        page: currentPage,
        limit: 10,
      });

      setDocuments(res.data);
      setTotalItems(res.pagination.totalItems);
      setTotalPages(res.pagination.totalPages);
      setKpi(res.kpi);
      setVendorList(res.vendors);
    } catch (err) {
      console.error('Error fetching documents:', err);
    }
  }, [user, searchQuery, statusFilter, vendorFilter, sortBy, currentPage]);

  useEffect(() => {
    if (user) {
      loadDocuments();
      loadSettings();
    }
  }, [user, loadDocuments, loadSettings]);

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
  };

  const handleNavigateToDocumentsWithFilter = (status?: string) => {
    if (status) {
      setStatusFilter(status);
    } else {
      setStatusFilter('Semua');
    }
    setSelectedDocumentId(null);
    setActiveTab('documents');
  };

  const handleDeleteDocument = async () => {
    if (!confirmDeleteDoc) return;
    try {
      await api.deleteDocument(confirmDeleteDoc.id);
      setConfirmDeleteDoc(null);
      loadDocuments();
    } catch (err: any) {
      alert('Gagal menghapus dokumen: ' + err.message);
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center space-y-3 text-white">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        <p className="text-xs text-slate-400 font-medium tracking-wide">
          Memuat sistem Document Tracker Vendor...
        </p>
      </div>
    );
  }

  // Not logged in -> Show Login Page
  if (!user) {
    return (
      <LoginPage
        onLoginSuccess={(loggedInUser) => {
          setUser(loggedInUser);
          checkAuth();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Top Banner indicating Google Sheets / Drive connection status */}
      <SimulationBanner status={googleStatus} />

      {/* Main Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setSelectedDocumentId(null);
          setActiveTab(tab);
        }}
        onOpenUpload={() => setIsUploadOpen(true)}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* If viewing a document detail */}
        {selectedDocumentId ? (
          <DocumentDetailPage
            documentId={selectedDocumentId}
            settings={settings}
            onBack={() => setSelectedDocumentId(null)}
            onChangeStatus={(doc) => setStatusModalDoc(doc)}
            onUploadNewVersion={(doc) => setVersionModalDoc(doc)}
            onTriggerSendWhatsApp={(doc) => setSendWhatsAppDoc(doc)}
          />
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DashboardPage
                kpi={kpi}
                documents={documents}
                settings={settings}
                onNavigateToDocuments={handleNavigateToDocumentsWithFilter}
                onOpenUpload={() => setIsUploadOpen(true)}
                onSelectDocument={(doc) => setSelectedDocumentId(doc.id)}
                onTriggerSendWhatsApp={(doc) => setSendWhatsAppDoc(doc)}
              />
            )}

            {activeTab === 'documents' && (
              <DocumentListPage
                documents={documents}
                totalItems={totalItems}
                totalPages={totalPages}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                vendorFilter={vendorFilter}
                setVendorFilter={setVendorFilter}
                sortBy={sortBy}
                setSortBy={setSortBy}
                vendorList={vendorList}
                onOpenUpload={() => setIsUploadOpen(true)}
                onSelectDocument={(doc) => setSelectedDocumentId(doc.id)}
                onChangeStatus={(doc) => setStatusModalDoc(doc)}
                onTriggerSendWhatsApp={(doc) => setSendWhatsAppDoc(doc)}
                onDeleteDocument={(doc) => setConfirmDeleteDoc(doc)}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsPage
                initialSettings={settings}
                initialRules={reminderRules}
                onSaved={() => {
                  loadSettings();
                  loadDocuments();
                }}
              />
            )}

            {activeTab === 'logs' && <DeliveryLogsPage />}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4">
          <p>
            Document Tracker Vendor • Google Sheets Database & Google Drive Storage • WhatsApp Gateway via Fonnte
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Server Timezone: {settings?.timezone || 'Asia/Jakarta'} • Auto-Scheduler Aktif Setiap Menit
          </p>
        </div>
      </footer>

      {/* Global Modals */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={() => {
          loadDocuments();
          setActiveTab('documents');
        }}
        maxFileSizeMb={settings?.max_file_size_mb || 10}
      />

      <ChangeStatusModal
        isOpen={Boolean(statusModalDoc)}
        onClose={() => setStatusModalDoc(null)}
        document={statusModalDoc}
        onSuccess={() => {
          loadDocuments();
        }}
      />

      <UploadVersionModal
        isOpen={Boolean(versionModalDoc)}
        onClose={() => setVersionModalDoc(null)}
        document={versionModalDoc}
        onSuccess={() => {
          loadDocuments();
        }}
        maxFileSizeMb={settings?.max_file_size_mb || 10}
      />

      <SendWhatsAppModal
        isOpen={Boolean(sendWhatsAppDoc)}
        onClose={() => setSendWhatsAppDoc(null)}
        document={sendWhatsAppDoc}
        settings={settings}
        onSuccess={() => {
          loadDocuments();
        }}
      />

      {/* Confirm Delete Dialog */}
      {confirmDeleteDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-100 text-xs">
            <h3 className="text-base font-bold text-slate-800">Konfirmasi Hapus Dokumen</h3>
            <p className="text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus dokumen <strong>"{confirmDeleteDoc.judul}"</strong> dari vendor <strong>{confirmDeleteDoc.vendor}</strong>?
            </p>
            <p className="text-[11px] text-slate-400">
              Dokumen akan di-soft delete di Google Sheets dan tidak akan diproses lagi oleh scheduler WhatsApp.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmDeleteDoc(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-medium cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteDocument}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold cursor-pointer"
              >
                Hapus Dokumen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
