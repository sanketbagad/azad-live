import React, { useState } from 'react';
import {
  Trophy,
  Zap,
  Shield,
  UserCheck,
  Eye,
  Settings,
  Download,
  Upload,
  RefreshCw,
  PlusCircle,
  LogIn,
  LogOut,
  Menu,
  X,
  User,
  Database,
} from 'lucide-react';
import { useCricket } from '../context/CricketContext';

interface HeaderProps {
  onOpenQuickMatch: () => void;
  onOpenCreateTournament: () => void;
  onSelectTab: (tab: string) => void;
  currentTab: string;
  activePortal?: 'cricket' | 'auction';
  onSelectPortal?: (portal: 'cricket' | 'auction') => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenQuickMatch,
  onOpenCreateTournament,
  onSelectTab,
  currentTab,
  activePortal = 'cricket',
  onSelectPortal,
}) => {
  const {
    connectionStatus,
    currentUser,
    userRole,
    logout,
    openAuthModal,
    exportBackup,
    importBackup,
    resetDemoData,
  } = useCricket();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const success = await importBackup(json);
        if (success) {
          alert('Database restored successfully!');
          setShowSettingsModal(false);
        } else {
          alert('Failed to import database file.');
        }
      } catch {
        alert('Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-xl">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Logo & Branding */}
          <div
            className="flex items-center space-x-2.5 cursor-pointer flex-shrink-0 group"
            onClick={() => {
              onSelectTab('live_matches');
              setMobileMenuOpen(false);
            }}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-rose-600 to-red-700 flex items-center justify-center shadow-lg shadow-red-950/40 border border-amber-400/30 group-hover:scale-105 transition-transform flex-shrink-0">
              <Trophy className="w-5 h-5 text-amber-100" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center space-x-1.5">
                <span className="font-black text-lg sm:text-xl tracking-tight text-white flex items-center">
                  AZAD
                  <span className="ml-1.5 px-1.5 py-0.5 rounded text-[11px] font-black tracking-widest bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-sm shadow-red-500/30 border border-red-500/50">
                    LIVE
                  </span>
                </span>
                <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-600/40 hidden sm:inline-block">
                  Broadcast
                </span>
              </div>
              <p className="text-[10px] text-amber-200/60 hidden md:block font-medium">
                Professional Cricket Broadcast & Live Scoring
              </p>
            </div>
          </div>

          {/* Portal Switcher: Cricket Portal vs Auction Hub */}
          <div className="hidden sm:flex items-center bg-slate-950/90 border border-slate-800 rounded-xl p-1 text-xs">
            <button
              onClick={() => onSelectPortal?.('cricket')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activePortal === 'cricket'
                  ? 'bg-amber-500 text-black shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🏏 Cricket Portal</span>
            </button>

            <button
              onClick={() => onSelectPortal?.('auction')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activePortal === 'auction'
                  ? 'bg-amber-500 text-black shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🔨 Auction Hub</span>
            </button>
          </div>

          {/* Desktop Real-Time Connection Status Indicator */}
          <div className="hidden lg:flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-950/80 border border-slate-800 text-xs">
            {connectionStatus === 'connected' ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-300 font-medium text-[11px]">Sync Active</span>
              </>
            ) : connectionStatus === 'connecting' ? (
              <>
                <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
                <span className="text-amber-300 text-[11px]">Connecting...</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span className="text-rose-300 text-[11px]">Offline</span>
              </>
            )}
          </div>

          {/* Desktop Navigation & Actions (Hidden on mobile) */}
          <div className="hidden md:flex items-center space-x-2 sm:space-x-3">
            {/* Quick Match Button */}
            <button
              onClick={onOpenQuickMatch}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-900/30 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-100 fill-emerald-100" />
              <span>Quick Match</span>
            </button>

            {/* Create Tournament Button */}
            <button
              onClick={onOpenCreateTournament}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-900/30 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <PlusCircle className="w-3.5 h-3.5 text-blue-100" />
              <span>Tournament</span>
            </button>

            {/* Admin Dashboard Tab Trigger */}
            <button
              onClick={() => onSelectTab('admin')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all whitespace-nowrap ${
                currentTab === 'admin'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Admin</span>
            </button>

            {/* Auth / Profile Badge */}
            {currentUser ? (
              <div className="flex items-center space-x-2 pl-1 border-l border-slate-800">
                <div
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                    userRole === 'admin'
                      ? 'bg-amber-950/60 border-amber-600/60 text-amber-300'
                      : userRole === 'scorer'
                      ? 'bg-cyan-950/60 border-cyan-600/60 text-cyan-300'
                      : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                  title={`Logged in as ${currentUser.name} (${userRole})`}
                >
                  {userRole === 'admin' ? (
                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                  ) : userRole === 'scorer' ? (
                    <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                  ) : (
                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span className="capitalize">{userRole}</span>
                </div>

                <button
                  onClick={logout}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => openAuthModal('login')}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs shadow-md transition-all active:scale-95"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}

            {/* Settings Trigger */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Database Settings & Backups"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Right Controls: Compact Quick Match + Hamburger Toggle */}
          <div className="flex md:hidden items-center space-x-2">
            <button
              onClick={onOpenQuickMatch}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs"
            >
              <Zap className="w-3 h-3 fill-white" />
              <span>Quick</span>
            </button>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-cyan-400" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE DRAWER / SLIDEDOWN MENU (100% Responsive, within screen boundaries) */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-950 border-b border-slate-800 px-4 py-4 space-y-4 max-h-[85vh] overflow-y-auto">
          {/* User Status Bar */}
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 flex-shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-xs text-white truncate">
                  {currentUser ? currentUser.name : 'Guest Spectator'}
                </div>
                <div className="text-[10px] text-slate-400 capitalize">
                  Role: <span className="text-cyan-300 font-semibold">{userRole}</span>
                </div>
              </div>
            </div>

            {currentUser ? (
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="px-2.5 py-1 rounded-lg bg-rose-950/60 text-rose-300 border border-rose-800 text-xs font-semibold flex items-center space-x-1"
              >
                <LogOut className="w-3 h-3" />
                <span>Logout</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  openAuthModal('login');
                  setMobileMenuOpen(false);
                }}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 text-white font-bold text-xs flex items-center space-x-1"
              >
                <LogIn className="w-3 h-3" />
                <span>Sign In</span>
              </button>
            )}
          </div>

          {/* Portal Switcher for Mobile */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-1.5 flex gap-1.5">
            <button
              onClick={() => {
                onSelectPortal?.('cricket');
                setMobileMenuOpen(false);
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold text-center transition-all ${
                activePortal === 'cricket'
                  ? 'bg-amber-500 text-black font-black shadow-md'
                  : 'text-slate-400 hover:text-white bg-slate-950'
              }`}
            >
              🏏 Cricket Portal
            </button>
            <button
              onClick={() => {
                onSelectPortal?.('auction');
                setMobileMenuOpen(false);
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold text-center transition-all ${
                activePortal === 'auction'
                  ? 'bg-amber-500 text-black font-black shadow-md'
                  : 'text-slate-400 hover:text-white bg-slate-950'
              }`}
            >
              🔨 Auction Hub
            </button>
          </div>

          {/* Navigation Shortcuts in Mobile Menu */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                onOpenQuickMatch();
                setMobileMenuOpen(false);
              }}
              className="p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-700/60 text-emerald-300 font-bold text-xs flex items-center space-x-2"
            >
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>Quick Match</span>
            </button>

            <button
              onClick={() => {
                onOpenCreateTournament();
                setMobileMenuOpen(false);
              }}
              className="p-2.5 rounded-xl bg-blue-950/50 border border-blue-700/60 text-blue-300 font-bold text-xs flex items-center space-x-2"
            >
              <PlusCircle className="w-4 h-4 text-blue-400" />
              <span>New Tournament</span>
            </button>

            <button
              onClick={() => {
                onSelectTab('admin');
                setMobileMenuOpen(false);
              }}
              className="p-2.5 rounded-xl bg-amber-950/50 border border-amber-700/60 text-amber-300 font-bold text-xs flex items-center space-x-2"
            >
              <Shield className="w-4 h-4 text-amber-400" />
              <span>Admin Panel</span>
            </button>

            <button
              onClick={() => {
                setShowSettingsModal(true);
                setMobileMenuOpen(false);
              }}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-bold text-xs flex items-center space-x-2"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <span>Settings / Data</span>
            </button>
          </div>

          {/* Connection Status in Mobile Drawer */}
          <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-xs text-slate-400">
            <span>Server Sync Status:</span>
            <span className="font-semibold text-emerald-400 flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="capitalize">{connectionStatus}</span>
            </span>
          </div>
        </div>
      )}

      {/* FULLY RESPONSIVE SETTINGS & BACKUP MODAL (Screen bounds safe, mobile friendly) */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 sm:p-6 space-y-4 shadow-2xl my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center space-x-2">
                <Settings className="w-4 h-4 text-cyan-400" />
                <span>Application Settings & Backups</span>
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <span className="font-bold text-slate-300 uppercase block text-[11px]">Database Actions</span>
                <button
                  onClick={() => {
                    exportBackup();
                    setShowSettingsModal(false);
                  }}
                  className="w-full py-2.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center space-x-2 transition-colors"
                >
                  <Download className="w-4 h-4 text-cyan-400" />
                  <span>Export Full Backup (JSON)</span>
                </button>

                <label className="w-full py-2.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center space-x-2 transition-colors cursor-pointer">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span>Import Backup File</span>
                  <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              {userRole === 'admin' && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <span className="font-bold text-slate-300 uppercase block text-[11px]">Demo Data Maintenance</span>
                  <button
                    onClick={async () => {
                      if (confirm('Restore default sample tournament and matches? Your custom matches will be preserved.')) {
                        await resetDemoData(false);
                        setShowSettingsModal(false);
                      }
                    }}
                    className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold flex items-center space-x-2 text-left"
                  >
                    <RefreshCw className="w-4 h-4 text-amber-400" />
                    <span>Restore Sample Tournaments</span>
                  </button>

                  <button
                    onClick={async () => {
                      if (confirm('Reset EVERYTHING back to initial seed data?')) {
                        await resetDemoData(true);
                        setShowSettingsModal(false);
                      }
                    }}
                    className="w-full py-2 px-3 rounded-lg bg-rose-950/50 hover:bg-rose-900 text-rose-300 font-semibold flex items-center space-x-2 text-left"
                  >
                    <RefreshCw className="w-4 h-4 text-rose-400" />
                    <span>Full Factory Reset</span>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowSettingsModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
