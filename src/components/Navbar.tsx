import React, { useState } from 'react';
import {
  FileText,
  LayoutDashboard,
  FolderOpen,
  Settings,
  BellRing,
  Plus,
  LogOut,
  User,
  Menu,
  X,
  Send,
} from 'lucide-react';
import { UserProfile } from '../types';

interface Props {
  activeTab: 'dashboard' | 'documents' | 'settings' | 'logs';
  setActiveTab: (tab: 'dashboard' | 'documents' | 'settings' | 'logs') => void;
  onOpenUpload: () => void;
  user: UserProfile | null;
  onLogout: () => void;
}

export const Navbar: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  onOpenUpload,
  user,
  onLogout,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'documents', label: 'Daftar Dokumen', icon: FolderOpen },
    { id: 'logs', label: 'Log WhatsApp', icon: BellRing },
    { id: 'settings', label: 'Pengaturan & Jadwal', icon: Settings },
  ] as const;

  const handleNavClick = (id: 'dashboard' | 'documents' | 'settings' | 'logs') => {
    setActiveTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base sm:text-lg font-bold text-slate-900 tracking-tight block leading-tight">
                Vendor Tracker
              </span>
              <span className="text-[11px] text-slate-500 hidden sm:block">
                Google Sheets • Drive • WhatsApp
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Actions & User Profile */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={onOpenUpload}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Unggah Dokumen</span>
            </button>

            <div className="h-6 w-px bg-slate-200 mx-1" />

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
                <User className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-700">
                {user?.username || 'admin'}
              </span>

              <button
                onClick={onLogout}
                title="Keluar"
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={onOpenUpload}
              className="p-2 bg-emerald-600 text-white rounded-lg cursor-pointer"
              aria-label="Unggah"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-2 shadow-lg">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-800 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                {item.label}
              </button>
            );
          })}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <User className="w-4 h-4 text-slate-400" />
              <span>{user?.username || 'admin'}</span>
            </div>
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1 text-xs text-rose-600 font-medium px-2.5 py-1.5 rounded-lg hover:bg-rose-50"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
