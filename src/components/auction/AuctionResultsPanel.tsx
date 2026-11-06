import React, { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { useCricket } from '../../context/CricketContext';
import { useAuctionApi } from '../../services/auctionApi';
import type { AuctionRecord, AuctionState } from '../../types/cricket';
import { formatMoney } from '../../utils/auction';
import { PlayerPhoto } from './PlayerPhoto';

export const AuctionResultsPanel: React.FC<{ auction: AuctionState; canEdit: boolean }> = ({ auction, canEdit }) => {
  const { state } = useCricket();
  const api = useAuctionApi();
  const [editing, setEditing] = useState<AuctionRecord | null>(null);
  const [message, setMessage] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null);

  const records = Object.values(auction.records).sort((a, b) => b.at - a.at);
  const sold = records.filter((r) => r.status === 'SOLD');
  const unsold = records.filter((r) => r.status === 'UNSOLD');
  const total = sold.reduce((s, r) => s + r.price, 0);
  const top = [...sold].sort((a, b) => b.price - a.price)[0];

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    setMessage(null);
    try {
      await fn();
      setMessage({ text: ok, tone: 'ok' });
    } catch (err: any) {
      setMessage({ text: err.message, tone: 'error' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="card p-3 text-center">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Sold</div>
          <div className="font-display text-3xl text-pitch-400">{sold.length}</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Total spent</div>
          <div className="font-display text-2xl text-trophy-300 tabular-nums">{formatMoney(total)}</div>
        </div>
        <div className="card p-3 text-center min-w-0">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Top buy</div>
          <div className="text-xs font-bold text-white truncate mt-1">{top ? auction.players[top.playerId]?.name : '—'}</div>
          <div className="text-[11px] text-trophy-300 tabular-nums">{top ? formatMoney(top.price) : ''}</div>
        </div>
      </div>

      {message && (
        <div className={`rounded-xl px-3 py-2 text-sm font-semibold ${message.tone === 'error' ? 'bg-live-600/15 text-live-400 border border-live-500/30' : 'bg-pitch-500/10 text-pitch-400 border border-pitch-500/30'}`}>
          {message.text}
        </div>
      )}

      <section className="card p-4">
        <h3 className="text-sm font-bold text-white">Sold players</h3>
        {sold.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">No sales yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-white/[0.05]">
            {sold.map((r) => {
              const p = auction.players[r.playerId];
              const t = r.teamId ? state.teams[r.teamId] : undefined;
              return (
                <li key={r.playerId} className="py-2.5 flex items-center gap-3">
                  <PlayerPhoto player={p} className="w-10 h-10 rounded-lg shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-white truncate">
                      <span className="text-slate-500">#{p?.number}</span> {p?.name}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: t?.color }} />
                      {t?.name}
                      {r.round === 2 && <span className="chip bg-live-600/15 text-live-400 !py-0">Re-auction</span>}
                    </div>
                  </div>
                  <div className="font-display text-xl font-semibold text-trophy-300 tabular-nums shrink-0">{formatMoney(r.price)}</div>
                  {canEdit && (
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => setEditing(r)} className="w-8 h-8 grid place-items-center rounded-lg bg-white/5" aria-label="Edit sale">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() =>
                          confirm(`Delete the sale of ${p?.name}? They go back to pending.`) && act(() => api.deleteRecord(r.playerId), 'Sale removed.')
                        }
                        className="w-8 h-8 grid place-items-center rounded-lg bg-white/5"
                        aria-label="Delete sale"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="card p-4">
        <h3 className="text-sm font-bold text-white">Unsold players</h3>
        {unsold.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">No unsold players.</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {unsold.map((r) => {
              const p = auction.players[r.playerId];
              return (
                <li key={r.playerId} className="flex items-center gap-2 rounded-full bg-white/[0.04] border border-white/[0.06] pl-1 pr-2 py-1">
                  <PlayerPhoto player={p} className="w-7 h-7 rounded-full" />
                  <span className="text-xs text-slate-200">
                    #{p?.number} {p?.name}
                  </span>
                  <span className="text-[10px] text-slate-500">{formatMoney(p?.base)}</span>
                  {canEdit && (
                    <button onClick={() => act(() => api.deleteRecord(r.playerId), `${p?.name} is pending again.`)} className="text-[10px] text-brand-300 font-bold ml-1">
                      Undo
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {canEdit && (
        <section className="card p-4 border-live-500/20">
          <h3 className="text-sm font-bold text-live-400">Start over</h3>
          <p className="text-[11px] text-slate-500 mt-1">Clears every sale, unsold mark, top-up and the re-auction. Download a backup first (Players tab).</p>
          <div className="mt-3 grid sm:grid-cols-2 gap-2">
            <button
              onClick={() => confirm('Clear all auction results but keep players and teams?') && act(() => api.reset(false), 'Auction results cleared.')}
              className="btn-ghost text-xs !border-live-500/30 !text-live-400"
            >
              Clear results
            </button>
            <button
              onClick={() =>
                confirm('Delete ALL auction players and results? Teams are kept. This cannot be undone.') && act(() => api.reset(true), 'Auction cleared.')
              }
              className="btn-ghost text-xs !border-live-500/30 !text-live-400"
            >
              Delete players & results
            </button>
          </div>
        </section>
      )}

      {editing && (
        <EditSale
          auction={auction}
          record={editing}
          onClose={() => setEditing(null)}
          onSave={(teamId, price) =>
            act(() => api.editRecord(editing.playerId, { teamId, price }), 'Sale updated.').then(() => setEditing(null))
          }
        />
      )}
    </div>
  );
};

const EditSale: React.FC<{ auction: AuctionState; record: AuctionRecord; onClose: () => void; onSave: (teamId: string, price: number) => void }> = ({
  auction,
  record,
  onClose,
  onSave,
}) => {
  const { state } = useCricket();
  const [teamId, setTeamId] = useState(record.teamId || '');
  const [price, setPrice] = useState(String(record.price));
  const p = auction.players[record.playerId];
  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl bg-ink-850 border border-white/10 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-3">
        <h3 className="font-display text-2xl font-semibold text-white">Edit sale · {p?.name}</h3>
        <select value={teamId} onChange={(e) => setTeamId(e.target.value)} className="w-full h-11 rounded-xl bg-ink-950/60 border border-white/10 px-3 text-sm text-white">
          {auction.teamIds.map((id) => (
            <option key={id} value={id}>
              {state.teams[id]?.name}
            </option>
          ))}
        </select>
        <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" className="w-full h-11 rounded-xl bg-ink-950/60 border border-white/10 px-3 text-sm text-white" />
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onClose} className="btn-ghost text-xs">
            Cancel
          </button>
          <button onClick={() => onSave(teamId, Number(price))} className="btn-primary text-xs">
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
