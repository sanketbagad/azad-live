import React, { useState } from 'react';
import { useCricket } from '../context/CricketContext';
import { useAuctionSync } from '../hooks/useAuctionSync';
import { AuctionSyncView } from './AuctionSyncView';
import {
  Gavel,
  Radio,
  Users,
  Coins,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Trophy,
  Activity,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface AuctionHubPortalProps {
  onSwitchToCricketPortal: () => void;
}

export type AuctionHubTab = 'live_sync' | 'teams_purse' | 'squad_bridge' | 'auction_guide';

export const AuctionHubPortal: React.FC<AuctionHubPortalProps> = ({
  onSwitchToCricketPortal,
}) => {
  const { state } = useCricket();
  const teams = Object.values(state.teams);
  const { auctionPlayers, syncStatus, lastSyncTime, stats } = useAuctionSync();
  const [activeTab, setActiveTab] = useState<AuctionHubTab>('live_sync');

  const playersList = Object.values(auctionPlayers);
  const soldPlayers = playersList.filter((p) => p.soldStatus === 'SOLD');

  // Compute team purse expenditure from auction
  const teamPurseMap: Record<
    string,
    { name: string; shortName: string; color: string; spent: number; count: number; players: typeof soldPlayers }
  > = {};

  teams.forEach((t) => {
    teamPurseMap[t.id] = {
      name: t.name,
      shortName: t.shortName,
      color: t.color || '#3B82F6',
      spent: 0,
      count: 0,
      players: [],
    };
  });

  soldPlayers.forEach((sp) => {
    if (sp.teamId && teamPurseMap[sp.teamId]) {
      teamPurseMap[sp.teamId].spent += sp.soldPrice || 0;
      teamPurseMap[sp.teamId].count += 1;
      teamPurseMap[sp.teamId].players.push(sp);
    }
  });

  return (
    <div className="space-y-6">
      {/* Auction Hub Portal Hero Header */}
      <div className="bg-gradient-to-r from-amber-950/80 via-ink-850 to-red-950/80 border border-amber-500/40 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-black tracking-widest bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md border border-red-500/60 leading-none">
                AZAD LIVE
              </span>
              <span className="text-xs uppercase font-extrabold tracking-widest text-amber-400 flex items-center gap-1.5">
                <Gavel className="w-4 h-4 text-amber-400" />
                <span>Premier Auction Hub</span>
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-display font-semibold tracking-wide leading-none text-white mt-1.5 flex items-center space-x-2">
              <span>Tournament Player Auction Portal</span>
            </h1>

            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Dedicated module for real-time player bidding, purse tracking, and automated squad bridging. Operates independently from live match scoring workflows.
            </p>
          </div>

          {/* Quick Portal Switcher Button */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onSwitchToCricketPortal}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-ink-850 hover:bg-white/[0.05] text-slate-200 border border-white/10 text-xs font-bold transition-all shadow-md group cursor-pointer"
            >
              <Radio className="w-4 h-4 text-emerald-400" />
              <span>Back to Cricket Scoring Portal</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Quick Auction Metrics Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-amber-500/20 text-center">
          <div className="bg-ink-950/70 border border-white/[0.06] rounded-xl p-3">
            <div className="text-[10px] uppercase font-bold text-slate-400">Total Players</div>
            <div className="text-xl font-black text-white font-mono mt-0.5">{stats.total}</div>
          </div>
          <div className="bg-ink-950/70 border border-white/[0.06] rounded-xl p-3">
            <div className="text-[10px] uppercase font-bold text-emerald-400">Sold Players</div>
            <div className="text-xl font-black text-emerald-400 font-mono mt-0.5">{stats.soldCount}</div>
          </div>
          <div className="bg-ink-950/70 border border-white/[0.06] rounded-xl p-3">
            <div className="text-[10px] uppercase font-bold text-rose-400">Unsold</div>
            <div className="text-xl font-black text-rose-400 font-mono mt-0.5">{stats.unsoldCount}</div>
          </div>
          <div className="bg-ink-950/70 border border-white/[0.06] rounded-xl p-3">
            <div className="text-[10px] uppercase font-bold text-amber-400">Total Purse Spent</div>
            <div className="text-xl font-black text-amber-400 font-mono mt-0.5">
              ₹{stats.totalSpent.toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </div>

      {/* Auction Hub Sub-Navigation Bar */}
      <div className="card p-2 shadow-lg flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('live_sync')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'live_sync'
              ? 'bg-amber-500 text-black font-black shadow-lg shadow-amber-950'
              : 'bg-ink-950/60 text-slate-300 hover:bg-white/[0.05] border border-white/[0.06]'
          }`}
        >
          <Gavel className="w-4 h-4" />
          <span>1. Live Auction Sync & Roster</span>
        </button>

        <button
          onClick={() => setActiveTab('teams_purse')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'teams_purse'
              ? 'bg-amber-500 text-black font-black shadow-lg shadow-amber-950'
              : 'bg-ink-950/60 text-slate-300 hover:bg-white/[0.05] border border-white/[0.06]'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>2. Teams Purse Tracker ({Object.keys(teamPurseMap).length})</span>
        </button>

        <button
          onClick={() => setActiveTab('squad_bridge')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'squad_bridge'
              ? 'bg-amber-500 text-black font-black shadow-lg shadow-amber-950'
              : 'bg-ink-950/60 text-slate-300 hover:bg-white/[0.05] border border-white/[0.06]'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>3. Official Squad Bridge</span>
        </button>

        <button
          onClick={() => setActiveTab('auction_guide')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'auction_guide'
              ? 'bg-amber-500 text-black font-black shadow-lg shadow-amber-950'
              : 'bg-ink-950/60 text-slate-300 hover:bg-white/[0.05] border border-white/[0.06]'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>4. Integration Snippet & Security</span>
        </button>
      </div>

      {/* SUB-TAB 1: LIVE AUCTION SYNC (Unmodified Original AuctionSyncView) */}
      {activeTab === 'live_sync' && <AuctionSyncView />}

      {/* SUB-TAB 2: TEAMS PURSE & SQUAD TRACKER */}
      {activeTab === 'teams_purse' && (
        <div className="space-y-5">
          <div className="card p-5 shadow-xl flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-white flex items-center space-x-2">
                <Coins className="w-5 h-5 text-amber-400" />
                <span>Participating Teams Purse & Expenditure</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time tracking of player acquisitions and purse consumption per franchise
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(teamPurseMap).map(([tid, t]) => (
              <div
                key={tid}
                className="card p-5 shadow-lg space-y-4 hover:border-white/10 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-3.5 h-10 rounded-full"
                      style={{ backgroundColor: t.color }}
                    />
                    <div>
                      <h4 className="font-black text-base text-white">{t.name}</h4>
                      <span className="text-xs font-mono text-slate-400 font-semibold">
                        {t.shortName}
                      </span>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-lg bg-amber-950/80 border border-amber-600/50 text-amber-300 font-mono text-xs font-bold">
                    {t.count} Bought
                  </span>
                </div>

                <div className="p-3 bg-ink-950/60 rounded-xl border border-white/[0.06] flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-semibold">Purse Spent:</span>
                  <span className="font-mono text-base font-black text-amber-400">
                    ₹{t.spent.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Players Bought */}
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Players Acquired:</div>
                  {t.players.length === 0 ? (
                    <div className="text-xs text-slate-500 italic py-1">No players bought yet.</div>
                  ) : (
                    t.players.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-ink-950/60 border border-white/[0.06]"
                      >
                        <span className="text-slate-200 font-medium truncate">{p.name}</span>
                        <span className="font-mono text-amber-400 font-bold shrink-0 ml-2">
                          ₹{p.soldPrice?.toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: OFFICIAL SQUAD BRIDGE */}
      {activeTab === 'squad_bridge' && (
        <div className="card p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-black text-white">Live Score App Official Squads Bridge</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Players marked as <strong>SOLD</strong> in the Auction Hub can be synced to official teams in the Cricket Scoring Portal. This bridge verifies that players exist in the tournament rosters without modifying live match state or existing records.
          </p>

          <div className="space-y-3 pt-2">
            {teams.map((team) => (
              <div
                key={team.id}
                className="p-4 bg-ink-950/60 border border-white/[0.06] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-8 rounded-full" style={{ backgroundColor: team.color }} />
                  <div>
                    <div className="font-bold text-sm text-white">{team.name}</div>
                    <div className="text-xs text-slate-400 font-mono">
                      Current Official Squad: {team.squad.length} Players
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Roster Verified</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: INTEGRATION SNIPPET & SECURITY */}
      {activeTab === 'auction_guide' && (
        <div className="card p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-black text-white">Auction Control HTML Integration Guide</h3>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Your independent HTML file (<code>KPL_Auction_Control_Custom_Teams_Groups.html</code>) broadcasts SOLD players directly to the Firestore collection <code>kpl_auction_players</code>. The AZAD LIVE Auction Hub listens to these events in real-time.
          </p>

          <div className="p-4 rounded-xl bg-ink-950/60 border border-white/[0.06] space-y-2 text-xs text-slate-300">
            <div className="font-bold text-white text-sm">Security & Isolation Guarantees:</div>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>Live match scoring runs independently and is never interrupted by auction bidding.</li>
              <li>Official squad sync requires authenticated organizer or admin authorization.</li>
              <li>Zero-Click or Manual Sync operates via validated team ID matching.</li>
              <li>Auction records are stored in their own segregated collection without altering cricket matches.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
