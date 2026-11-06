import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Gavel, ListChecks, Monitor, Radio, Trophy, Users, Wallet } from 'lucide-react';
import { useCricket } from '../context/CricketContext';
import { usePermissions } from '../auth/permissions';
import { auctionCounts, createEmptyAuction } from '../utils/auction';
import { AuctionControlPanel } from './auction/AuctionControlPanel';
import { AuctionPlayersPanel } from './auction/AuctionPlayersPanel';
import { AuctionTeamsPanel } from './auction/AuctionTeamsPanel';
import { AuctionResultsPanel } from './auction/AuctionResultsPanel';
import { AuctionDisplay, TeamBoard } from './auction/AuctionDisplay';
import { AuctionSyncView } from './AuctionSyncView';

interface AuctionHubPortalProps {
  onSwitchToCricketPortal: () => void;
}

type HubTab = 'auction' | 'players' | 'teams' | 'results' | 'legacy';

/**
 * Auction Hub: run a KPL-style player auction inside the app.
 * Admins control it; everyone else sees the live auction, purses and results.
 */
export const AuctionHubPortal: React.FC<AuctionHubPortalProps> = () => {
  const { state } = useCricket();
  const { can } = usePermissions();
  const canEdit = can('auction.sync');
  const auction = state.auction || createEmptyAuction();
  const counts = auctionCounts(auction);
  const hasPlayers = counts.total > 0 || Object.keys(auction.players).length > 0;
  const [tab, setTab] = useState<HubTab>(hasPlayers ? 'auction' : 'players');

  const tabs: { key: HubTab; label: string; icon: React.ReactNode; show: boolean }[] = [
    { key: 'auction', label: canEdit ? 'Auction' : 'Live', icon: <Gavel className="w-4 h-4" />, show: true },
    { key: 'players', label: 'Players', icon: <Users className="w-4 h-4" />, show: true },
    { key: 'teams', label: 'Teams & purse', icon: <Wallet className="w-4 h-4" />, show: true },
    { key: 'results', label: 'Results', icon: <ListChecks className="w-4 h-4" />, show: true },
    { key: 'legacy', label: 'HTML sync', icon: <Radio className="w-4 h-4" />, show: canEdit },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <section className="card p-4 sm:p-5 bg-gradient-to-br from-trophy-500/10 via-transparent to-pulse-500/10">
        <div className="flex items-start gap-3">
          <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-trophy-400 to-trophy-500 grid place-items-center shrink-0">
            <Trophy className="w-5 h-5 text-ink-950" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-trophy-300">Auction hub</div>
            <h2 className="font-display text-3xl font-semibold text-white leading-tight truncate">{auction.name}</h2>
          </div>
          <a
            href="/?auction=display"
            target="_blank"
            rel="noreferrer"
            className="btn-ghost !min-h-10 !px-3 text-xs shrink-0"
            title="Open the big-screen display"
          >
            <Monitor className="w-4 h-4" /> <span className="hidden sm:inline">Display</span>
          </a>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {(
            [
              ['Players', counts.total, 'text-white'],
              ['Sold', counts.sold, 'text-pitch-400'],
              ['Unsold', counts.unsold, 'text-live-400'],
              ['Pending', counts.pending, 'text-brand-300'],
            ] as const
          ).map(([label, v, cls]) => (
            <div key={label} className="rounded-xl bg-white/[0.04] border border-white/[0.05] px-2 py-2 text-center">
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
              <div className={`font-display text-2xl font-semibold leading-none mt-0.5 ${cls}`}>{v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Tabs */}
      <div className="-mx-4 px-4 flex gap-1.5 overflow-x-auto scrollbar-none">
        {tabs
          .filter((t) => t.show)
          .map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative shrink-0 h-10 px-4 rounded-full text-xs font-semibold flex items-center gap-1.5 ${tab === t.key ? 'text-white' : 'text-slate-400 bg-white/[0.03]'}`}
            >
              {tab === t.key && (
                <motion.span
                  layoutId="auction-tab"
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-trophy-500/25 to-pulse-500/20 border border-trophy-400/40"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative flex items-center gap-1.5">
                {t.icon}
                {t.label}
              </span>
            </button>
          ))}
      </div>

      {tab === 'auction' &&
        (canEdit ? (
          <AuctionControlPanel auction={auction} />
        ) : (
          <div className="space-y-4">
            <AuctionDisplay />
            <TeamBoard auction={auction} teams={state.teams} />
          </div>
        ))}
      {tab === 'players' && <AuctionPlayersPanel auction={auction} canEdit={canEdit} />}
      {tab === 'teams' && <AuctionTeamsPanel auction={auction} canEdit={canEdit} />}
      {tab === 'results' && <AuctionResultsPanel auction={auction} canEdit={canEdit} />}
      {tab === 'legacy' && canEdit && (
        <div className="space-y-3">
          <p className="text-xs text-slate-400">
            For the old standalone HTML auction tool that writes to Firestore. You don’t need this when running the auction here.
          </p>
          <AuctionSyncView />
        </div>
      )}
    </div>
  );
};
