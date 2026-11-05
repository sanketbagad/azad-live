import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { LayoutGrid, LogOut, X, Activity, RefreshCw } from 'lucide-react';
import { useCricket } from '../../context/CricketContext';
import {
  TABS,
  TAB_GROUP_LABELS,
  TabGroup,
  TabKey,
  getMobilePrimaryTabs,
  getTab,
  usePermissions,
} from '../../auth/permissions';
import { Avatar, Logo, RoleBadge } from '../ui/Brand';

interface AppShellProps {
  currentTab: TabKey;
  onNavigate: (tab: TabKey) => void;
  /** Match the user is currently scoring, shown as a shortcut */
  scoringMatch?: { id: string; name: string } | null;
  children: React.ReactNode;
}

const GROUP_ORDER: TabGroup[] = ['main', 'competition', 'broadcast', 'manage'];

const ConnectionBadge: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { connectionStatus } = useCricket();
  const config = {
    connected: { dot: 'bg-pitch-400', text: 'Live sync', textClass: 'text-pitch-400' },
    connecting: { dot: 'bg-trophy-400', text: 'Connecting', textClass: 'text-trophy-300' },
    offline: { dot: 'bg-live-500', text: 'Offline', textClass: 'text-live-400' },
  }[connectionStatus];
  return (
    <span className="inline-flex items-center gap-1.5" title={`Real-time sync: ${connectionStatus}`}>
      {connectionStatus === 'connecting' ? (
        <RefreshCw className="w-3 h-3 text-trophy-400 animate-spin" />
      ) : (
        <span className={`w-2 h-2 rounded-full ${config.dot} ${connectionStatus === 'connected' ? 'animate-pulse' : ''}`} />
      )}
      {!compact && <span className={`text-[11px] font-semibold ${config.textClass}`}>{config.text}</span>}
    </span>
  );
};

export const AppShell: React.FC<AppShellProps> = ({ currentTab, onNavigate, scoringMatch, children }) => {
  const { currentUser, logout } = useCricket();
  const { role, canAccessTab } = usePermissions();
  const [moreOpen, setMoreOpen] = useState(false);

  const visibleTabs = TABS.filter((t) => !t.hiddenInNav && canAccessTab(t.key));
  const primaryKeys = getMobilePrimaryTabs(role);
  const currentDef = getTab(currentTab);
  const isMoreActive = !primaryKeys.includes(currentTab);

  // Close the sheet when navigating
  useEffect(() => setMoreOpen(false), [currentTab]);

  const go = (tab: TabKey) => {
    onNavigate(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!currentUser) return null;

  const groupedNav = GROUP_ORDER.map((group) => ({
    group,
    tabs: visibleTabs.filter((t) => t.group === group),
  })).filter((g) => g.tabs.length > 0);

  return (
    <div className="min-h-dvh bg-stadium text-slate-100">
      {/* ============ DESKTOP SIDEBAR ============ */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-white/[0.05] bg-ink-950/60 backdrop-blur-xl z-30">
        <div className="h-16 px-5 flex items-center">
          <Logo onClick={() => go('home')} />
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-none px-3 py-1 space-y-4">
          {scoringMatch && (
            <button
              onClick={() => go('scoring')}
              className={`w-full flex items-center gap-2.5 p-3 rounded-xl text-left border transition-colors ${
                currentTab === 'scoring'
                  ? 'bg-pitch-500/15 border-pitch-500/40'
                  : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06]'
              }`}
            >
              <Activity className="w-4 h-4 text-pitch-400 shrink-0" />
              <span className="min-w-0">
                <span className="block text-[10px] uppercase tracking-wider text-pitch-400 font-bold">Now scoring</span>
                <span className="block text-xs text-white truncate">{scoringMatch.name}</span>
              </span>
            </button>
          )}

          {groupedNav.map(({ group, tabs }) => (
            <div key={group}>
              <div className="px-3 mb-1.5 text-[10px] uppercase tracking-[0.15em] text-slate-500 font-bold">
                {TAB_GROUP_LABELS[group]}
              </div>
              <ul className="space-y-0.5">
                {tabs.map((t) => {
                  const active = currentTab === t.key;
                  return (
                    <li key={t.key}>
                      <button
                        onClick={() => go(t.key)}
                        className={`relative w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                          active ? 'text-white' : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                        }`}
                      >
                        {active && (
                          <motion.span
                            layoutId="sidebar-active"
                            className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand-500/20 to-pulse-500/10 border border-brand-500/30"
                            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                          />
                        )}
                        <t.icon className={`relative w-4.5 h-4.5 ${active ? 'text-brand-300' : ''}`} />
                        <span className="relative">{t.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-white/[0.05]">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03]">
            <Avatar user={currentUser} size={36} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-white truncate">{currentUser.name}</div>
              <RoleBadge role={role} className="mt-0.5" />
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="p-2 rounded-lg text-slate-400 hover:text-live-400 hover:bg-white/5"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-2 px-2.5">
            <ConnectionBadge />
          </div>
        </div>
      </aside>

      {/* ============ TOP BAR (mobile + tablet) / page header (desktop) ============ */}
      <header className="sticky top-0 z-20 pt-safe bg-ink-900/70 backdrop-blur-xl border-b border-white/[0.04] lg:pl-64">
        <div className="h-14 lg:h-16 px-4 lg:px-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="lg:hidden">
              <Logo compact onClick={() => go('home')} />
            </div>
            <AnimatePresence mode="wait">
              <motion.h1
                key={currentTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="font-display text-2xl lg:text-3xl font-semibold leading-none truncate pt-1"
              >
                {currentDef.label}
              </motion.h1>
            </AnimatePresence>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="lg:hidden">
              <ConnectionBadge compact />
            </span>
            <span className="hidden lg:inline-flex">
              <RoleBadge role={role} />
            </span>
            <button onClick={() => setMoreOpen(true)} className="lg:hidden" aria-label="Open menu">
              <Avatar user={currentUser} size={32} />
            </button>
          </div>
        </div>
      </header>

      {/* ============ PAGE CONTENT ============ */}
      <main className="lg:pl-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 lg:py-8 pb-28 lg:pb-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTab}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* ============ MOBILE BOTTOM NAV ============ */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 pb-safe bg-ink-950/85 backdrop-blur-xl border-t border-white/[0.06]">
        {scoringMatch && currentTab !== 'scoring' && (
          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            onClick={() => go('scoring')}
            className="absolute -top-14 left-1/2 -translate-x-1/2 btn-primary !min-h-10 !py-2 !rounded-full text-xs shadow-xl whitespace-nowrap max-w-[90vw]"
          >
            <Activity className="w-4 h-4" />
            <span className="truncate">Resume scoring</span>
          </motion.button>
        )}
        <ul className="grid grid-cols-5 h-16">
          {primaryKeys.map((key) => {
            const t = getTab(key);
            const active = currentTab === key;
            return (
              <li key={key}>
                <button
                  onClick={() => go(key)}
                  className="relative w-full h-full flex flex-col items-center justify-center gap-1"
                  aria-current={active ? 'page' : undefined}
                >
                  {active && (
                    <motion.span
                      layoutId="bottom-active"
                      className="absolute top-0 w-10 h-1 rounded-b-full bg-gradient-to-r from-brand-400 to-pulse-400"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <motion.span animate={{ scale: active ? 1.12 : 1 }} transition={{ type: 'spring', stiffness: 400 }}>
                    <t.icon className={`w-5 h-5 ${active ? 'text-brand-300' : 'text-slate-500'}`} />
                  </motion.span>
                  <span className={`text-[10px] font-semibold ${active ? 'text-white' : 'text-slate-500'}`}>{t.shortLabel}</span>
                </button>
              </li>
            );
          })}
          <li>
            <button
              onClick={() => setMoreOpen(true)}
              className="relative w-full h-full flex flex-col items-center justify-center gap-1"
            >
              {isMoreActive && (
                <motion.span
                  layoutId="bottom-active"
                  className="absolute top-0 w-10 h-1 rounded-b-full bg-gradient-to-r from-brand-400 to-pulse-400"
                />
              )}
              <LayoutGrid className={`w-5 h-5 ${isMoreActive ? 'text-brand-300' : 'text-slate-500'}`} />
              <span className={`text-[10px] font-semibold ${isMoreActive ? 'text-white' : 'text-slate-500'}`}>More</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* ============ MOBILE "MORE" SHEET ============ */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              className="lg:hidden fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-ink-850 border-t border-white/10 pb-safe"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 100 || info.velocity.y > 500) setMoreOpen(false);
              }}
            >
              <div className="sticky top-0 bg-ink-850 pt-3 pb-2 px-5 z-10">
                <div className="w-10 h-1.5 rounded-full bg-white/15 mx-auto mb-4" />
                <div className="flex items-center gap-3">
                  <Avatar user={currentUser} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-white truncate">{currentUser.name}</div>
                    <div className="text-[11px] text-slate-500 truncate">{currentUser.email}</div>
                  </div>
                  <button onClick={() => setMoreOpen(false)} className="p-2 rounded-full bg-white/5" aria-label="Close menu">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <RoleBadge role={role} />
                  <ConnectionBadge />
                </div>
              </div>

              <div className="px-5 pt-2 pb-6 space-y-5">
                {groupedNav.map(({ group, tabs }) => (
                  <div key={group}>
                    <div className="text-[10px] uppercase tracking-[0.15em] text-slate-500 font-bold mb-2">
                      {TAB_GROUP_LABELS[group]}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {tabs.map((t, i) => {
                        const active = currentTab === t.key;
                        return (
                          <motion.button
                            key={t.key}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            whileTap={{ scale: 0.94 }}
                            onClick={() => go(t.key)}
                            className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl min-h-20 text-center border ${
                              active
                                ? 'bg-brand-500/15 border-brand-500/40 text-white'
                                : 'bg-white/[0.03] border-white/[0.05] text-slate-300'
                            }`}
                          >
                            <t.icon className={`w-5 h-5 ${active ? 'text-brand-300' : 'text-slate-400'}`} />
                            <span className="text-[11px] font-semibold leading-tight">{t.label}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <button
                  onClick={logout}
                  className="w-full flex items-center justify-center gap-2 min-h-12 rounded-2xl bg-live-600/10 border border-live-500/30 text-live-400 font-semibold text-sm"
                >
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
