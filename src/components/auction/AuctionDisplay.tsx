import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { Gavel } from 'lucide-react';
import { useCricket } from '../../context/CricketContext';
import type { AuctionPlayer, AuctionState, Team } from '../../types/cricket';
import { auctionCounts, eligiblePlayers, formatMoney, teamStats } from '../../utils/auction';
import { PlayerPhoto } from './PlayerPhoto';

/**
 * The auction "big screen": entry presentation, live bid, SOLD / UNSOLD, and team purses.
 * standalone = full-screen public page (projector / OBS window capture).
 */
export const AuctionDisplay: React.FC<{ standalone?: boolean }> = ({ standalone }) => {
  const { state } = useCricket();
  const auction = state.auction;

  if (!auction || Object.keys(auction.players).length === 0) {
    return (
      <div className={`${standalone ? 'min-h-dvh' : 'min-h-[320px] rounded-3xl'} grid place-items-center bg-[radial-gradient(ellipse_at_top,#193b64,#07101e_60%,#02050b)] text-center p-6`}>
        <div>
          <Gavel className="w-10 h-10 text-trophy-400 mx-auto" />
          <div className="font-display text-4xl font-semibold text-white mt-3">{auction?.name || 'Player Auction'}</div>
          <div className="text-slate-400 mt-1">The auction will appear here when it starts.</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${standalone ? 'min-h-dvh p-3 sm:p-5' : 'rounded-3xl p-3 sm:p-4'} bg-[radial-gradient(ellipse_at_top_left,#172d4a_0%,#081321_52%,#090f1e_100%)] text-white overflow-hidden`}>
      {standalone && (
        <header className="text-center mb-3 sm:mb-4">
          <div className="text-[11px] sm:text-sm font-bold tracking-[0.35em] text-brand-300">LIVE PLAYER AUCTION</div>
          <h1 className="font-display text-3xl sm:text-5xl font-bold text-trophy-300 leading-none mt-1">{auction.name}</h1>
        </header>
      )}
      <div className={`grid gap-3 sm:gap-4 ${standalone ? 'xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]' : ''}`}>
        <Stage auction={auction} teams={state.teams} standalone={standalone} />
        {standalone && <TeamBoard auction={auction} teams={state.teams} />}
      </div>
    </div>
  );
};

const Stage: React.FC<{ auction: AuctionState; teams: Record<string, Team>; standalone?: boolean }> = ({ auction, teams, standalone }) => {
  const { live } = auction;
  const player = live.currentPlayerId ? auction.players[live.currentPlayerId] : undefined;
  const leading = live.leadingTeamId ? teams[live.leadingTeamId] : undefined;
  const record = player ? auction.records[player.id] : undefined;
  const soldTeam = record?.status === 'SOLD' && record.teamId ? teams[record.teamId] : undefined;

  // Entry: cinematic intro, then the profile
  const [introDone, setIntroDone] = useState(false);
  useEffect(() => {
    setIntroDone(false);
    if (live.presentation !== 'entry') return;
    const t = setTimeout(() => setIntroDone(true), 2300);
    return () => clearTimeout(t);
  }, [live.presentation, live.currentPlayerId]);

  // Confetti on SOLD
  useEffect(() => {
    if (live.presentation !== 'sold' || !standalone) return;
    try {
      confetti({ particleCount: 140, spread: 90, origin: { y: 0.55 }, colors: ['#ffc857', '#36d9c5', soldTeam?.color || '#ffffff'] });
    } catch {
      // cosmetic
    }
  }, [live.presentation, live.currentPlayerId]);

  // Full-height intros everywhere; the player card only fills the screen on large displays
  const minH = standalone ? 'min-h-[60vh] lg:min-h-[70vh]' : 'min-h-[360px]';
  const stageMinH = standalone ? 'lg:min-h-[70vh]' : '';

  if (live.presentation === 'shuffling') return <Shuffling auction={auction} minH={minH} />;
  if (!player || live.presentation === 'idle') return <Summary auction={auction} teams={teams} minH={minH} />;

  if (live.presentation === 'entry' && !introDone) {
    return (
      <div className={`relative ${minH} rounded-3xl grid place-items-center overflow-hidden bg-[radial-gradient(ellipse_at_50%_35%,#193b64_0%,#07101e_58%,#02050b_100%)] border border-trophy-400/30`}>
        <motion.div
          className="absolute w-[70vmin] h-[70vmin] rounded-full bg-[radial-gradient(circle,#ffc85724_0%,#36d9c515_35%,transparent_70%)]"
          animate={{ scale: [1, 1.06, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.div className="relative text-center" initial={{ opacity: 0, y: 35, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.8 }}>
          <div className="text-[11px] sm:text-base font-extrabold tracking-[0.25em] text-trophy-300">{auction.name.toUpperCase()}</div>
          <motion.div className="text-6xl sm:text-8xl my-3" animate={{ rotate: [-8, 8, -8], scale: [1, 1.1, 1] }} transition={{ duration: 2.6, repeat: Infinity }}>
            🏏
          </motion.div>
          <div className="font-display font-bold leading-[0.9] text-6xl sm:text-8xl xl:text-9xl">
            THE NEXT
            <br />
            <span className="text-trophy-300">CHAMPION</span>
          </div>
          <div className="mt-5 font-extrabold tracking-[0.45em] text-brand-300 text-sm sm:text-xl">PLAYER ENTRY</div>
        </motion.div>
      </div>
    );
  }

  const showWaiting = live.presentation === 'entry';
  const stamp = live.presentation === 'sold' ? 'SOLD' : live.presentation === 'unsold' ? 'UNSOLD' : null;

  return (
    <motion.div
      key={player.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative ${stageMinH} rounded-3xl border-2 border-brand-500/40 bg-gradient-to-br from-[#071525] via-[#102944] to-[#171d3c] p-4 sm:p-6 overflow-hidden flex flex-col`}
    >
      <div className="flex items-center justify-between text-xs sm:text-sm font-bold">
        <span className="text-trophy-300 tracking-wider">
          {auction.reAuctionStarted ? 'RE-AUCTION' : 'PLAYER AUCTION'} · NO. {player.number}
        </span>
        <span className="flex items-center gap-1.5 text-pitch-400">
          <span className="live-dot !bg-pitch-400" /> LIVE
        </span>
      </div>

      <div className="mt-4 grid grid-cols-[minmax(110px,32%)_1fr] gap-4 sm:gap-6 items-start">
        <PlayerPhoto player={player} className="w-full aspect-[3/4] rounded-2xl border-2 border-trophy-400/70 shadow-2xl" />
        <div className="min-w-0">
          <div className="text-[10px] sm:text-xs font-black tracking-[0.22em] text-brand-300">PLAYER PROFILE</div>
          <div className="font-display font-bold leading-[0.95] text-4xl sm:text-6xl xl:text-7xl break-words mt-1">{player.name}</div>
          <div className="text-trophy-300 font-semibold text-sm sm:text-xl mt-2">{player.role}</div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {player.city && <span className="px-2 py-1 rounded-md border border-white/15 text-[11px] sm:text-sm">{player.city}</span>}
            <span className="px-2 py-1 rounded-md bg-trophy-400 text-ink-950 font-black text-[11px] sm:text-sm">NO. {player.number}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {(
              [
                ['MATCHES', player.matches],
                ['RUNS', player.runs],
                ['WICKETS', player.wickets],
              ] as const
            ).map(([label, v]) => (
              <div key={label} className="rounded-xl bg-white/[0.05] border border-white/10 text-center py-2">
                <div className="text-[9px] sm:text-[11px] text-slate-400 font-bold">{label}</div>
                <div className="font-display text-2xl sm:text-4xl font-bold text-trophy-300 leading-none mt-0.5">{v ?? '—'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-auto pt-4 grid grid-cols-2 gap-2 sm:gap-3">
        <div className="rounded-2xl bg-white/[0.05] border border-white/10 p-3 text-center">
          <div className="text-[10px] sm:text-xs text-slate-400 font-bold tracking-wider">
            {showWaiting ? 'BASE PRICE' : stamp === 'SOLD' ? 'SOLD FOR' : 'CURRENT BID'}
          </div>
          <AnimatePresence mode="popLayout">
            <motion.div
              key={live.bid}
              initial={{ scale: 1.25, color: '#ffffff' }}
              animate={{ scale: 1, color: '#ffc857' }}
              className="font-display font-bold text-4xl sm:text-6xl leading-none mt-1 tabular-nums"
            >
              {formatMoney(stamp === 'SOLD' ? record?.price : showWaiting ? player.base : live.bid)}
            </motion.div>
          </AnimatePresence>
        </div>
        <div
          className="rounded-2xl border p-3 text-center"
          style={{
            borderColor: (soldTeam || leading)?.color || 'rgba(255,255,255,0.1)',
            background: `${(soldTeam || leading)?.color || '#ffffff'}1f`,
          }}
        >
          <div className="text-[10px] sm:text-xs text-slate-400 font-bold tracking-wider">{stamp === 'SOLD' ? 'TEAM' : 'HIGHEST BIDDER'}</div>
          <div className="font-display font-bold text-2xl sm:text-4xl leading-tight mt-1 break-words">
            {(soldTeam || leading)?.name || (showWaiting ? 'Waiting for auctioneer…' : '—')}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {stamp && (
          <motion.div
            className="absolute inset-0 grid place-items-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 2.4, rotate: -20, opacity: 0 }}
              animate={{ scale: 1, rotate: -12, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 16 }}
              className={`px-6 sm:px-10 py-2 border-[6px] sm:border-8 rounded-xl font-display font-bold text-6xl sm:text-8xl xl:text-9xl bg-ink-950/85 ${
                stamp === 'SOLD' ? 'text-live-400 border-live-400' : 'text-slate-300 border-slate-400'
              }`}
            >
              {stamp}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const Shuffling: React.FC<{ auction: AuctionState; minH: string }> = ({ auction, minH }) => {
  const pool = useMemo(() => eligiblePlayers(auction), [auction]);
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => x + 1), 110);
    return () => clearInterval(t);
  }, []);
  const p: AuctionPlayer | undefined = pool.length ? pool[Math.floor(Math.random() * pool.length)] : undefined;
  return (
    <div className={`${minH} rounded-3xl border-2 border-trophy-400/70 bg-gradient-to-br from-[#071525] to-[#171d3c] grid place-items-center text-center p-6 shadow-[0_0_0_6px_rgba(255,200,87,0.25)]`}>
      <div>
        <div className="text-sm sm:text-lg font-extrabold tracking-[0.3em] text-trophy-300">🎲 PICKING THE NEXT PLAYER</div>
        <div key={i} className="font-display font-bold text-5xl sm:text-7xl mt-4 blur-[0.3px]">
          {p ? p.name : '…'}
        </div>
        {p && <div className="text-slate-400 mt-2 text-lg">No. {p.number}</div>}
      </div>
    </div>
  );
};

const Summary: React.FC<{ auction: AuctionState; teams: Record<string, Team>; minH: string }> = ({ auction, teams, minH }) => {
  const c = auctionCounts(auction);
  return (
    <div className={`${minH} rounded-3xl border border-white/10 bg-gradient-to-br from-[#0d1b2d] to-[#122941] p-4 sm:p-6 flex flex-col`}>
      <div className="text-center">
        <div className="text-xs sm:text-sm font-bold tracking-[0.3em] text-brand-300">{auction.reAuctionStarted ? 'RE-AUCTION' : 'AUCTION'} SUMMARY</div>
        <div className="font-display text-4xl sm:text-6xl font-bold text-white mt-1">Next player coming up</div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-5">
        {(
          [
            ['Players', c.total, 'text-trophy-300'],
            ['Sold', c.sold, 'text-pitch-400'],
            ['Unsold', c.unsold, 'text-live-400'],
            ['Pending', c.pending, 'text-brand-300'],
          ] as const
        ).map(([label, v, cls]) => (
          <div key={label} className="rounded-2xl bg-white/[0.05] border border-white/10 p-3 text-center">
            <div className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider">{label}</div>
            <div className={`font-display text-4xl sm:text-5xl font-bold ${cls}`}>{v}</div>
          </div>
        ))}
      </div>
      <RecentSales auction={auction} teams={teams} />
    </div>
  );
};

const RecentSales: React.FC<{ auction: AuctionState; teams: Record<string, Team> }> = ({ auction, teams }) => {
  const recent = Object.values(auction.records)
    .filter((r) => r.status === 'SOLD')
    .sort((a, b) => b.at - a.at)
    .slice(0, 5);
  if (!recent.length) return null;
  return (
    <div className="mt-5">
      <div className="text-xs font-bold tracking-wider text-slate-400 mb-2">LATEST SALES</div>
      <ul className="space-y-1.5">
        {recent.map((r) => {
          const p = auction.players[r.playerId];
          const t = r.teamId ? teams[r.teamId] : undefined;
          return (
            <li key={r.playerId} className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-2">
              <PlayerPhoto player={p} className="w-9 h-9 rounded-lg shrink-0" />
              <span className="font-semibold truncate flex-1">{p?.name}</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-md shrink-0" style={{ background: `${t?.color || '#64748b'}33` }}>
                {t?.shortName}
              </span>
              <span className="font-display text-xl font-bold text-trophy-300 tabular-nums shrink-0">{formatMoney(r.price)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

/** Team purses; the highlighted row rotates every 5 seconds */
export const TeamBoard: React.FC<{ auction: AuctionState; teams: Record<string, Team> }> = ({ auction, teams }) => {
  const ids = auction.teamIds.filter((id) => teams[id]);
  const [highlight, setHighlight] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setHighlight((h) => (ids.length ? (h + 1) % ids.length : 0)), 5000);
    return () => clearInterval(t);
  }, [ids.length]);
  const focusId = ids[highlight];
  const focus = focusId ? teamStats(auction, focusId) : null;

  return (
    <aside className="rounded-3xl border border-pulse-500/30 bg-gradient-to-b from-[#102844] to-[#171a35] p-3 sm:p-4 min-w-0">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-2xl font-semibold text-trophy-300">Team purses</h2>
        <span className="text-[11px] text-slate-400">Purse {formatMoney(auction.rules.purse)}</span>
      </div>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-xs sm:text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-slate-400">
              <th className="py-1.5 pr-2 font-bold">Team</th>
              <th className="py-1.5 px-1 font-bold text-right">Players</th>
              <th className="py-1.5 px-1 font-bold text-right">Left</th>
              <th className="py-1.5 pl-1 font-bold text-right">Max bid</th>
            </tr>
          </thead>
          <tbody>
            {ids.map((id, i) => {
              const t = teams[id];
              const st = teamStats(auction, id);
              return (
                <tr key={id} className={`border-t border-white/[0.06] ${i === highlight ? 'bg-white/[0.07]' : ''}`}>
                  <td className="py-1.5 pr-2">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: t.color }} />
                      <span className="truncate font-semibold">{t.name}</span>
                    </span>
                  </td>
                  <td className="py-1.5 px-1 text-right tabular-nums">{st.playerCount}</td>
                  <td className={`py-1.5 px-1 text-right tabular-nums ${st.remaining < 0 ? 'text-live-400 font-bold' : ''}`}>{formatMoney(st.remaining)}</td>
                  <td className="py-1.5 pl-1 text-right tabular-nums font-bold text-pitch-400">{formatMoney(st.maxBid)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {focusId && focus && (
        <motion.div key={focusId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 rounded-2xl bg-ink-950/50 border border-white/10 p-3">
          <div className="font-bold text-trophy-300">{teams[focusId].name}</div>
          <div className="grid grid-cols-3 gap-2 mt-2 text-center">
            <div>
              <div className="text-[9px] text-slate-400 font-bold">SPENT</div>
              <div className="font-bold tabular-nums">{formatMoney(focus.spent)}</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-400 font-bold">LEFT</div>
              <div className="font-bold tabular-nums">{formatMoney(focus.remaining)}</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-400 font-bold">MAX BID</div>
              <div className="font-bold tabular-nums text-pitch-400">{formatMoney(focus.maxBid)}</div>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-slate-300 line-clamp-3">
            {focus.sold.length
              ? focus.sold.map((r) => `${auction.players[r.playerId]?.name} (${formatMoney(r.price)})`).join(' · ')
              : 'No players bought yet'}
          </div>
        </motion.div>
      )}
    </aside>
  );
};
