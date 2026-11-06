import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Check, Copy, Dices, ExternalLink, Gavel, Play, RotateCcw, SkipForward, Undo2, X } from 'lucide-react';
import { useCricket } from '../../context/CricketContext';
import { useAuctionApi } from '../../services/auctionApi';
import type { AuctionState } from '../../types/cricket';
import { auctionCounts, bidIncrement, eligiblePlayers, formatMoney, nextBidAmount, teamStats } from '../../utils/auction';
import { PlayerPhoto } from './PlayerPhoto';

export const AuctionControlPanel: React.FC<{ auction: AuctionState }> = ({ auction }) => {
  const { state } = useCricket();
  const api = useAuctionApi();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null);
  const [lookup, setLookup] = useState('');
  const [manualBid, setManualBid] = useState('');
  const [copied, setCopied] = useState(false);

  const { live } = auction;
  const player = live.currentPlayerId ? auction.players[live.currentPlayerId] : undefined;
  const record = player ? auction.records[player.id] : undefined;
  const leading = live.leadingTeamId ? state.teams[live.leadingTeamId] : undefined;
  const counts = auctionCounts(auction);
  const pool = eligiblePlayers(auction);
  const next = player ? nextBidAmount(auction) : 0;
  const teams = auction.teamIds.map((id) => state.teams[id]).filter(Boolean);
  const displayUrl = `${window.location.origin}/?auction=display`;

  const run = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    if (busy) return;
    setBusy(key);
    setMessage(null);
    try {
      await fn();
      if (ok) setMessage({ text: ok, tone: 'ok' });
    } catch (err: any) {
      setMessage({ text: err.message || 'Something went wrong', tone: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const goToNumber = () => {
    const p = Object.values(auction.players).find((x) => x.number === lookup.trim());
    if (!p) return setMessage({ text: `No player with number ${lookup}.`, tone: 'error' });
    if (p.playerType !== 'auction') return setMessage({ text: `${p.name} is a team ${p.playerType}, not in the auction.`, tone: 'error' });
    run('select', () => api.live('select', { playerId: p.id }), `#${p.number} ${p.name} is up.`);
  };

  const randomPlayer = () =>
    run('random', async () => {
      if (!pool.length) throw new Error(auction.reAuctionStarted ? 'No unsold players left for the re-auction.' : 'No pending players left.');
      const pick = pool[Math.floor(Math.random() * pool.length)];
      if (pool.length > 1) {
        await api.live('shuffle');
        await new Promise((r) => setTimeout(r, 2400));
      }
      await api.live('select', { playerId: pick.id });
      setMessage({ text: `🎲 #${pick.number} ${pick.name} is up.`, tone: 'ok' });
    });

  const nextPlayer = () => {
    if (!pool.length) return setMessage({ text: 'No players left in this round.', tone: 'error' });
    const idx = pool.findIndex((p) => p.id === player?.id);
    const pick = pool[(idx + 1) % pool.length];
    run('next', () => api.live('select', { playerId: pick.id }), `#${pick.number} ${pick.name} is up.`);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(displayUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      {/* ===== Left: pick player + round ===== */}
      <div className="space-y-4">
        <section className="card p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`chip ${auction.reAuctionStarted ? 'bg-live-600/20 text-live-400' : 'bg-brand-500/15 text-brand-300'}`}>
              {auction.reAuctionStarted ? 'Re-auction round' : 'Round 1'}
            </span>
            <span className="text-xs text-slate-400">
              {counts.sold} sold · {counts.unsold} unsold · <strong className="text-white">{counts.pending} pending</strong>
            </span>
          </div>
          <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
            <a href={displayUrl} target="_blank" rel="noreferrer" className="btn-primary text-xs">
              <ExternalLink className="w-4 h-4" /> Open big-screen display
            </a>
            <button onClick={copyLink} className="btn-ghost !px-3" aria-label="Copy display link">
              {copied ? <Check className="w-4 h-4 text-pitch-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Open it on the projector laptop or TV (or OBS → Browser source). No sign-in needed; it follows this screen live.
          </p>
        </section>

        <section className="card p-4">
          <h3 className="text-sm font-bold text-white">Call a player</h3>
          <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
            <input
              value={lookup}
              onChange={(e) => setLookup(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && goToNumber()}
              inputMode="numeric"
              placeholder="Player number, e.g. 25"
              className="h-12 rounded-xl bg-ink-950/60 border border-white/10 px-3 text-base text-white focus:outline-none focus:border-brand-400"
            />
            <button onClick={goToNumber} disabled={!lookup.trim() || !!busy} className="btn-primary !min-h-12 !px-5">
              GO
            </button>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button onClick={randomPlayer} disabled={!!busy} className="btn-ghost !min-h-12 text-xs">
              <Dices className="w-4 h-4 text-trophy-400" /> {busy === 'random' ? 'Shuffling…' : 'Random player'}
            </button>
            <button onClick={nextPlayer} disabled={!!busy} className="btn-ghost !min-h-12 text-xs">
              <SkipForward className="w-4 h-4 text-brand-300" /> Next player
            </button>
          </div>
          <div className="text-[11px] text-slate-500 mt-2">{pool.length} player(s) left in this round.</div>
          {!auction.reAuctionStarted && counts.pending === 0 && counts.unsold > 0 && (
            <button
              onClick={() =>
                confirm('Start the one-time re-auction of unsold players? Base prices stay the same.') &&
                run('reauction', () => api.startReauction(), 'Re-auction started.')
              }
              className="mt-3 w-full btn-ghost !min-h-11 text-xs !border-live-500/40 !text-live-400"
            >
              <RotateCcw className="w-4 h-4" /> Start one-time re-auction ({counts.unsold} unsold)
            </button>
          )}
        </section>

        {message && (
          <div
            className={`rounded-xl px-3 py-2 text-sm font-semibold ${
              message.tone === 'error' ? 'bg-live-600/15 text-live-400 border border-live-500/30' : 'bg-pitch-500/10 text-pitch-400 border border-pitch-500/30'
            }`}
            role="status"
          >
            {message.text}
          </div>
        )}
      </div>

      {/* ===== Right: current player + bidding ===== */}
      <section className="card p-4 space-y-4">
        {!player ? (
          <div className="py-10 text-center">
            <Gavel className="w-8 h-8 text-slate-500 mx-auto" />
            <p className="text-sm text-slate-400 mt-2">
              {live.presentation === 'shuffling' ? 'Picking a random player…' : 'Call a player to start bidding.'}
            </p>
          </div>
        ) : (
          <>
            <div className="flex gap-3">
              <PlayerPhoto player={player} className="w-20 h-24 rounded-xl shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold text-trophy-300">NO. {player.number}</div>
                <div className="font-display text-3xl font-semibold text-white leading-tight truncate">{player.name}</div>
                <div className="text-xs text-slate-400">
                  {player.role}
                  {player.city ? ` · ${player.city}` : ''} · Base {formatMoney(player.base)}
                </div>
                {record && (
                  <span className={`chip mt-1 ${record.status === 'SOLD' ? 'bg-pitch-500/15 text-pitch-400' : 'bg-live-600/15 text-live-400'}`}>
                    {record.status}
                    {record.status === 'SOLD' && record.teamId ? ` · ${state.teams[record.teamId]?.shortName} · ${formatMoney(record.price)}` : ''}
                  </span>
                )}
              </div>
              <button
                onClick={() => run('clear', () => api.live('clear'))}
                className="w-9 h-9 grid place-items-center rounded-full bg-white/5 shrink-0"
                aria-label="Clear player"
                title="Clear player"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {live.presentation === 'entry' && (
              <button onClick={() => run('start', () => api.live('start_bidding'))} className="w-full btn-primary !min-h-12">
                <Play className="w-4 h-4" /> Start bidding
              </button>
            )}

            {/* Current bid */}
            <div className="rounded-2xl bg-ink-950/60 border border-white/10 p-3 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Current bid</div>
                <motion.div key={live.bid} initial={{ scale: 1.15 }} animate={{ scale: 1 }} className="font-display text-5xl font-bold text-trophy-300 leading-none tabular-nums origin-left">
                  {formatMoney(live.bid)}
                </motion.div>
                <div className="text-xs mt-1 truncate" style={{ color: leading?.color }}>
                  {leading ? `▲ ${leading.name}` : <span className="text-slate-500">No bids yet: first bid is at base price</span>}
                </div>
              </div>
              <button
                onClick={() => run('undo', () => api.live('undo'))}
                disabled={!live.history.length || !!busy}
                className="btn-ghost !min-h-11 !px-3 text-xs shrink-0"
                title="Undo last bid"
              >
                <Undo2 className="w-4 h-4" /> Undo
              </button>
            </div>

            {/* Team bid buttons */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white">Tap the team that bids</span>
                <span className="text-[11px] text-slate-500">
                  Next bid {formatMoney(next)}
                  {leading ? ` (+${formatMoney(bidIncrement(live.bid, auction.rules))})` : ''}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {teams.map((t) => {
                  const st = teamStats(auction, t.id);
                  const isLeading = live.leadingTeamId === t.id;
                  const full = st.playerCount >= auction.rules.maxPlayers;
                  const cantAfford = next > st.maxBid;
                  const disabled = isLeading || full || cantAfford || !!busy || record?.status === 'SOLD';
                  return (
                    <button
                      key={t.id}
                      onClick={() => run(`bid_${t.id}`, () => api.live('bid', { teamId: t.id }))}
                      disabled={disabled}
                      className={`relative text-left rounded-xl border p-2.5 min-h-[64px] transition-all active:scale-95 disabled:active:scale-100 ${
                        isLeading ? 'ring-2 ring-white' : ''
                      } ${disabled && !isLeading ? 'opacity-40' : ''}`}
                      style={{ background: `${t.color}26`, borderColor: `${t.color}80` }}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: t.color }} />
                        <span className="text-xs font-black text-white truncate">{t.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-300 mt-1 tabular-nums">
                        {full ? 'Squad full' : `Max ${formatMoney(st.maxBid)}`}
                      </div>
                      <div className="text-[10px] text-slate-500 tabular-nums">{st.playerCount} players</div>
                    </button>
                  );
                })}
              </div>
              {teams.length === 0 && <p className="text-xs text-slate-500">Add teams in the Teams tab (or import them from Excel).</p>}
            </div>

            {/* Manual bid */}
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <input
                value={manualBid}
                onChange={(e) => setManualBid(e.target.value)}
                inputMode="numeric"
                placeholder="Set bid manually ₹"
                className="h-11 rounded-xl bg-ink-950/60 border border-white/10 px-3 text-sm text-white focus:outline-none focus:border-brand-400"
              />
              <button
                onClick={() => run('set', () => api.live('set_bid', { bid: Number(manualBid) }).then(() => setManualBid('')))}
                disabled={!manualBid || !!busy}
                className="btn-ghost !min-h-11 text-xs"
              >
                Set bid
              </button>
            </div>

            {/* Result */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => run('sold', () => api.sell(), `SOLD to ${leading?.name} for ${formatMoney(live.bid)}`)}
                disabled={!leading || !!busy}
                className="h-14 rounded-2xl bg-pitch-500 text-ink-950 font-black text-base disabled:opacity-40 active:scale-[0.98]"
              >
                SOLD{leading ? ` · ${leading.shortName}` : ''}
              </button>
              <button
                onClick={() => run('unsold', () => api.unsold(), `${player.name} is UNSOLD`)}
                disabled={!!busy || record?.status === 'SOLD'}
                className="h-14 rounded-2xl bg-live-600 text-white font-black text-base disabled:opacity-40 active:scale-[0.98]"
              >
                UNSOLD
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
};
