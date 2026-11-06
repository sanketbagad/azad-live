import React, { useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { useCricket } from '../../context/CricketContext';
import { useAuctionApi } from '../../services/auctionApi';
import type { AuctionRules, AuctionState } from '../../types/cricket';
import { formatMoney, teamColorFor, teamStats } from '../../utils/auction';

const field = 'w-full h-11 rounded-xl bg-ink-950/60 border border-white/10 px-3 text-sm text-white focus:outline-none focus:border-brand-400 disabled:opacity-60';
const label = 'block text-[11px] font-bold text-slate-400 mb-1';

export const AuctionTeamsPanel: React.FC<{ auction: AuctionState; canEdit: boolean }> = ({ auction, canEdit }) => {
  const { state } = useCricket();
  const api = useAuctionApi();
  const [message, setMessage] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
      setMessage({ text: ok, tone: 'ok' });
    } catch (err: any) {
      setMessage({ text: err.message, tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const teams = auction.teamIds.map((id) => state.teams[id]).filter(Boolean);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {message && (
        <div className={`rounded-xl px-3 py-2 text-sm font-semibold ${message.tone === 'error' ? 'bg-live-600/15 text-live-400 border border-live-500/30' : 'bg-pitch-500/10 text-pitch-400 border border-pitch-500/30'}`}>
          {message.text}
        </div>
      )}

      {/* Purse table */}
      <section className="card p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-bold text-white">Team purses</h3>
          <span className="text-[11px] text-slate-500">
            Purse {formatMoney(auction.rules.purse)} · fixed deduction {formatMoney(auction.rules.fixedDeduction)}
          </span>
        </div>
        {teams.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">No teams yet. Add them below or import from Excel.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {teams.map((t) => {
              const st = teamStats(auction, t.id);
              const open = expanded === t.id;
              const fixed = Object.values(auction.players).filter((p) => p.playerType !== 'auction' && p.teamId === t.id);
              return (
                <li key={t.id} className="rounded-xl bg-ink-950/50 border border-white/[0.06] overflow-hidden">
                  <button onClick={() => setExpanded(open ? null : t.id)} className="w-full text-left p-3 flex items-center gap-3">
                    <span className="w-9 h-9 rounded-lg grid place-items-center text-[10px] font-black text-white shrink-0" style={{ background: t.color }}>
                      {t.shortName.slice(0, 4)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-white truncate">{t.name}</span>
                      <span className="block text-[11px] text-slate-400 tabular-nums">
                        {st.playerCount} players · spent {formatMoney(st.spent)}
                      </span>
                    </span>
                    <span className="text-right shrink-0">
                      <span className={`block text-sm font-black tabular-nums ${st.remaining < 0 ? 'text-live-400' : 'text-white'}`}>{formatMoney(st.remaining)}</span>
                      <span className="block text-[10px] text-pitch-400 font-bold tabular-nums">max {formatMoney(st.maxBid)}</span>
                    </span>
                  </button>
                  {open && (
                    <div className="px-3 pb-3 text-xs space-y-2">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {(
                          [
                            ['Fixed deduction', st.deduction],
                            ['Auto bonus', st.bonus],
                            ['Top-up', st.topup],
                            ['Spent', st.spent],
                          ] as const
                        ).map(([k, v]) => (
                          <div key={k} className="rounded-lg bg-white/[0.04] p-2">
                            <div className="text-[10px] text-slate-500 font-bold">{k}</div>
                            <div className="font-bold text-white tabular-nums">{formatMoney(v)}</div>
                          </div>
                        ))}
                      </div>
                      <div className="text-slate-300">
                        <span className="text-slate-500">Owner & icons: </span>
                        {fixed.length ? fixed.map((p) => `${p.name} (${p.playerType})`).join(', ') : `none registered (counted as ${auction.rules.fixedPlayersPerTeam})`}
                      </div>
                      <div className="text-slate-300">
                        <span className="text-slate-500">Bought: </span>
                        {st.sold.length ? st.sold.map((r) => `${auction.players[r.playerId]?.name} (${formatMoney(r.price)})`).join(', ') : 'none yet'}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {canEdit && <TeamEditor auction={auction} busy={busy} onSave={(list) => run(() => api.saveTeams(list), 'Teams saved.')} />}
      {canEdit && <RulesEditor auction={auction} busy={busy} onSave={(payload) => run(() => api.saveSettings(payload), 'Auction rules saved.')} />}
      {canEdit && auction.rules.balanceMode === 'topup' && (
        <TopupForm auction={auction} busy={busy} onTopup={(teamId, amount) => run(() => api.topup(teamId, amount), `${formatMoney(amount)} added.`)} />
      )}
    </div>
  );
};

const TeamEditor: React.FC<{
  auction: AuctionState;
  busy: boolean;
  onSave: (teams: { id?: string; name: string; shortName?: string; color?: string }[]) => void;
}> = ({ auction, busy, onSave }) => {
  const { state } = useCricket();
  const fromState = () =>
    auction.teamIds.map((id) => state.teams[id]).filter(Boolean).map((t) => ({ id: t.id, name: t.name, shortName: t.shortName, color: t.color }));
  const [rows, setRows] = useState(fromState);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!dirty) setRows(fromState());
  }, [auction.teamIds.join(','), state.teams]);

  const update = (i: number, patch: Partial<(typeof rows)[number]>) => {
    setDirty(true);
    setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  };

  return (
    <section className="card p-4">
      <h3 className="text-sm font-bold text-white">Teams in this auction</h3>
      <p className="text-[11px] text-slate-500 mt-0.5">These become real teams in the app; bought players join their squads automatically.</p>
      <ul className="mt-3 space-y-2">
        {rows.map((row, i) => (
          <li key={row.id || `new-${i}`} className="grid grid-cols-[40px_1fr_76px_36px] gap-2 items-center">
            <input
              type="color"
              value={row.color || teamColorFor(i)}
              onChange={(e) => update(i, { color: e.target.value })}
              className="w-10 h-11 rounded-lg bg-transparent border border-white/10 p-1"
              aria-label="Team color"
            />
            <input className={field} value={row.name} onChange={(e) => update(i, { name: e.target.value })} placeholder={`Team ${i + 1}`} />
            <input className={field} value={row.shortName || ''} onChange={(e) => update(i, { shortName: e.target.value.toUpperCase() })} placeholder="Short" maxLength={6} />
            <button
              onClick={() => {
                setDirty(true);
                setRows((r) => r.filter((_, j) => j !== i));
              }}
              className="w-9 h-11 grid place-items-center rounded-lg bg-white/5"
              aria-label="Remove team"
            >
              <Trash2 className="w-4 h-4 text-slate-400" />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => {
            setDirty(true);
            setRows((r) => [...r, { name: '', shortName: '', color: teamColorFor(r.length) } as any]);
          }}
          className="btn-ghost text-xs flex-1"
        >
          <Plus className="w-4 h-4" /> Add team
        </button>
        <button
          onClick={() => {
            onSave(rows.filter((r) => r.name.trim()));
            setDirty(false);
          }}
          disabled={busy || !dirty}
          className="btn-primary text-xs flex-1"
        >
          <Save className="w-4 h-4" /> Save teams
        </button>
      </div>
    </section>
  );
};

const RulesEditor: React.FC<{ auction: AuctionState; busy: boolean; onSave: (payload: { name: string; rules: AuctionRules }) => void }> = ({
  auction,
  busy,
  onSave,
}) => {
  const [name, setName] = useState(auction.name);
  const [rules, setRules] = useState<AuctionRules>(auction.rules);
  useEffect(() => {
    setRules(auction.rules);
    setName(auction.name);
  }, [auction.rules, auction.name]);
  const set = (k: keyof AuctionRules, v: string) => setRules((r) => ({ ...r, [k]: k === 'balanceMode' || k === 'incrementMode' ? v : Number(v) }));
  const numberField = (k: keyof AuctionRules, text: string) => (
    <div>
      <label className={label}>{text}</label>
      <input className={field} inputMode="numeric" value={String(rules[k])} onChange={(e) => set(k, e.target.value)} />
    </div>
  );

  return (
    <section className="card p-4">
      <h3 className="text-sm font-bold text-white">Auction rules</h3>
      <div className="mt-3 space-y-3">
        <div>
          <label className={label}>Auction name (shown on the display)</label>
          <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. KPL 5 Player Auction" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {numberField('purse', 'Purse per team ₹')}
          {numberField('fixedDeduction', 'Owner + icons deduction ₹')}
          {numberField('minPlayers', 'Min players (incl. owner/icons)')}
          {numberField('maxPlayers', 'Max players (incl. owner/icons)')}
          {numberField('minBasePrice', 'Minimum base price ₹')}
          {numberField('fixedPlayersPerTeam', 'Owner + icons per team')}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Bid increments</label>
            <select className={field} value={rules.incrementMode} onChange={(e) => set('incrementMode', e.target.value)}>
              <option value="auto">Automatic (₹200 / ₹500 / ₹1,000)</option>
              <option value="manual">Fixed amount</option>
            </select>
          </div>
          {rules.incrementMode === 'manual' ? numberField('manualIncrement', 'Increment ₹') : <div />}
        </div>
        <div>
          <label className={label}>Balance mode</label>
          <select className={field} value={rules.balanceMode} onChange={(e) => set('balanceMode', e.target.value)}>
            <option value="none">No bonus</option>
            <option value="topup">Manual top-up</option>
            <option value="auto">Auto bonus</option>
          </select>
        </div>
        {rules.balanceMode === 'auto' && (
          <div className="grid grid-cols-2 gap-3">
            {numberField('bonusTrigger', 'Bonus when a sale is ≥ ₹')}
            {numberField('bonusAmount', 'Bonus to every other team ₹')}
          </div>
        )}
        <p className="text-[11px] text-slate-500">
          Max bid keeps enough purse to reach the minimum squad at the minimum base price. Increments: ₹200 below ₹2,000, ₹500 below ₹7,000, then ₹1,000.
        </p>
        <button
          onClick={() => confirm('Save the auction rules? Changing rules mid-auction changes every team’s purse and max bid.') && onSave({ name, rules })}
          disabled={busy}
          className="btn-primary w-full text-xs"
        >
          <Save className="w-4 h-4" /> Save rules
        </button>
      </div>
    </section>
  );
};

const TopupForm: React.FC<{ auction: AuctionState; busy: boolean; onTopup: (teamId: string, amount: number) => void }> = ({ auction, busy, onTopup }) => {
  const { state } = useCricket();
  const [teamId, setTeamId] = useState(auction.teamIds[0] || '');
  const [amount, setAmount] = useState('');
  return (
    <section className="card p-4">
      <h3 className="text-sm font-bold text-white">Top up a purse</h3>
      <div className="mt-3 grid grid-cols-[1fr_110px] gap-2">
        <select className={field} value={teamId} onChange={(e) => setTeamId(e.target.value)}>
          {auction.teamIds.map((id) => (
            <option key={id} value={id}>
              {state.teams[id]?.name}
            </option>
          ))}
        </select>
        <input className={field} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="₹" />
      </div>
      <button
        onClick={() => {
          onTopup(teamId, Number(amount));
          setAmount('');
        }}
        disabled={busy || !teamId || !Number(amount)}
        className="btn-primary w-full text-xs mt-2"
      >
        Add top-up
      </button>
    </section>
  );
};
