import React, { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Camera, Download, FileSpreadsheet, FileText, Pencil, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import { useCricket } from '../../context/CricketContext';
import { useAuctionApi } from '../../services/auctionApi';
import type { AuctionPlayer, AuctionState } from '../../types/cricket';
import { auctionPhotoUrl, compareNumbers, formatMoney } from '../../utils/auction';
import { ImportResult, PLAYERS_TEMPLATE_CSV, TEAMS_TEMPLATE_CSV, readAuctionFile } from '../../utils/auctionImport';
import { compressImage } from '../../utils/imageCompress';
import { PlayerPhoto } from './PlayerPhoto';

type Filter = 'all' | 'pending' | 'sold' | 'unsold' | 'owner' | 'icon';

function downloadText(filename: string, text: string, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export const AuctionPlayersPanel: React.FC<{ auction: AuctionState; canEdit: boolean }> = ({ auction, canEdit }) => {
  const { state } = useCricket();
  const api = useAuctionApi();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<Partial<AuctionPlayer> | null>(null);
  const [importPreview, setImportPreview] = useState<{ file: string; result: ImportResult } | null>(null);
  const [message, setMessage] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const players = useMemo(() => Object.values(auction.players).sort((a, b) => compareNumbers(a.number, b.number)), [auction.players]);
  const status = (p: AuctionPlayer) => (p.playerType !== 'auction' ? p.playerType : auction.records[p.id]?.status.toLowerCase() || 'pending');
  const visible = players.filter((p) => {
    if (filter !== 'all' && status(p) !== filter) return false;
    const team = p.teamId ? state.teams[p.teamId]?.name : '';
    return `${p.number} ${p.name} ${p.city || ''} ${p.role} ${team}`.toLowerCase().includes(query.toLowerCase());
  });
  const counts: Record<Filter, number> = {
    all: players.length,
    pending: players.filter((p) => status(p) === 'pending').length,
    sold: players.filter((p) => status(p) === 'sold').length,
    unsold: players.filter((p) => status(p) === 'unsold').length,
    owner: players.filter((p) => p.playerType === 'owner').length,
    icon: players.filter((p) => p.playerType === 'icon').length,
  };

  const onPickFile = async (file?: File) => {
    if (!file) return;
    setMessage(null);
    try {
      const result = await readAuctionFile(file);
      if (!result.players.length && !result.teams.length) throw new Error('No players or teams found in this file.');
      setImportPreview({ file: file.name, result });
    } catch (err: any) {
      setMessage({ text: err.message || 'Could not read this file', tone: 'error' });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const nextNumber = () => String(Math.max(0, ...players.map((p) => parseInt(p.number, 10)).filter(Number.isFinite)) + 1);

  const printList = (withPhotos: boolean) => {
    const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
    const cards = players
      .map((p) => {
        const r = auction.records[p.id];
        const teamName = p.teamId ? state.teams[p.teamId]?.name : r?.teamId ? state.teams[r.teamId]?.name : '';
        const label = p.playerType === 'owner' ? 'TEAM OWNER' : p.playerType === 'icon' ? 'ICON PLAYER' : 'AUCTION PLAYER';
        const photo = auctionPhotoUrl(p);
        const st = p.playerType !== 'auction' ? label : r ? `${r.status}${r.status === 'SOLD' ? ` · ${esc(teamName)} · ${formatMoney(r.price)}` : ''}` : 'PENDING';
        return `<article class="player ${withPhotos ? 'with-photo' : ''}">${
          withPhotos ? (photo ? `<img src="${esc(new URL(photo, window.location.origin).href)}">` : '<div class="nophoto"></div>') : ''
        }<div><span class="badge ${p.playerType}">${label}</span><h3>#${esc(p.number)} · ${esc(p.name)}</h3><p>${esc(p.role)} · ${esc(p.city || '—')}</p>${
          teamName && p.playerType !== 'auction' ? `<p class="team">Team: ${esc(teamName)}</p>` : ''
        }<p class="base">Base price: ${formatMoney(p.base)}</p><p>Status: ${st}</p>${
          p.playerType === 'auction' ? `<p>Matches: ${esc(p.matches ?? '—')} · Runs: ${esc(p.runs ?? '—')} · Wickets: ${esc(p.wickets ?? '—')}</p>` : ''
        }</div></article>`;
      })
      .join('');
    const w = window.open('', '_blank');
    if (!w) return setMessage({ text: 'Allow pop-ups to print the player list.', tone: 'error' });
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(auction.name)} · Player list</title><style>
      body{font-family:Arial,sans-serif;color:#172337;max-width:900px;margin:20px auto;padding:0 10px}h1{text-align:center;color:#123e68;margin:4px 0}
      .sub{text-align:center;color:#52677c;margin-bottom:14px}.bar{text-align:center;margin:10px 0 16px}.bar button{padding:10px 16px;border:0;border-radius:8px;background:#123e68;color:#fff;font-weight:bold}
      .player{display:flex;gap:14px;break-inside:avoid;border:2px solid #d5e3f2;border-left:7px solid #168b91;border-radius:11px;padding:10px 12px;margin:8px 0}
      .player img,.nophoto{width:120px;height:145px;flex:0 0 120px;object-fit:cover;border-radius:8px;border:2px solid #e4b64b;background:#dbe7f2}
      h3{margin:5px 0;color:#123e68}p{margin:4px 0;font-size:12px}.badge{font-size:10px;font-weight:bold;border-radius:20px;padding:4px 8px;background:#d9eaff;color:#164d79}
      .badge.owner{background:#ffe4b3;color:#774600}.badge.icon{background:#e5ddff;color:#4c2b92}.team{font-weight:bold;color:#087f75}.base{font-weight:bold;color:#b15b10}
      @page{size:A4;margin:12mm}@media print{body{margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}.bar{display:none}}</style></head><body>
      <h1>${esc(auction.name)} · Player list</h1><div class="sub">${players.length} players · ${withPhotos ? 'with photos' : 'without photos'}</div>
      <div class="bar"><button onclick="window.print()">Print / Save as PDF</button></div>${cards}</body></html>`);
    w.document.close();
  };

  const exportBackup = () => {
    const backup = {
      format: 'azad-live-auction@1',
      exportedAt: new Date().toISOString(),
      auction,
      teams: auction.teamIds.map((id) => state.teams[id]).filter(Boolean).map(({ id, name, shortName, color }) => ({ id, name, shortName, color })),
    };
    downloadText(`auction-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(backup, null, 2), 'application/json');
  };

  return (
    <div className="space-y-4">
      {canEdit && (
        <section className="card p-4">
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-pitch-400" /> Import players & teams
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Excel (.xlsx) with a <strong className="text-slate-200">Players</strong> sheet and an optional <strong className="text-slate-200">Teams</strong> sheet,
                a CSV file, or a backup from the KPL Auction Control tool. Teams are created automatically.
              </p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={() => fileRef.current?.click()} className="btn-primary flex-1 sm:flex-none text-xs">
                <Upload className="w-4 h-4" /> Import file
              </button>
              <button onClick={() => setEditing({ number: nextNumber(), role: 'Batsman', playerType: 'auction', base: auction.rules.minBasePrice })} className="btn-ghost flex-1 sm:flex-none text-xs">
                <Plus className="w-4 h-4" /> Add player
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.csv,.json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,application/json"
              className="hidden"
              onChange={(e) => onPickFile(e.target.files?.[0])}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <button onClick={() => downloadText('auction-players-template.csv', PLAYERS_TEMPLATE_CSV)} className="h-9 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-slate-300 flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" /> Players template
            </button>
            <button onClick={() => downloadText('auction-teams-template.csv', TEAMS_TEMPLATE_CSV)} className="h-9 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-slate-300 flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" /> Teams template
            </button>
            <button onClick={exportBackup} className="h-9 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-slate-300 flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" /> Download backup
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Tip: put both templates in one Excel file as two sheets named “Players” and “Teams”. Type is Auction, Owner or Icon; owners and icons need a team.
          </p>
        </section>
      )}

      {message && (
        <div className={`rounded-xl px-3 py-2 text-sm font-semibold ${message.tone === 'error' ? 'bg-live-600/15 text-live-400 border border-live-500/30' : 'bg-pitch-500/10 text-pitch-400 border border-pitch-500/30'}`}>
          {message.text}
        </div>
      )}

      <section className="card p-4">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, number, village or team"
              className="w-full h-11 rounded-xl bg-ink-950/60 border border-white/10 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-brand-400"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={() => printList(true)} className="btn-ghost !min-h-11 text-xs flex-1">
              <FileText className="w-4 h-4" /> PDF with photos
            </button>
            <button onClick={() => printList(false)} className="btn-ghost !min-h-11 text-xs flex-1">
              <FileText className="w-4 h-4" /> PDF
            </button>
          </div>
        </div>
        <div className="mt-3 -mx-4 px-4 flex gap-1.5 overflow-x-auto scrollbar-none">
          {(['all', 'pending', 'sold', 'unsold', 'owner', 'icon'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 h-9 px-3 rounded-full text-xs font-semibold capitalize border ${
                filter === f ? 'bg-white text-ink-950 border-white' : 'bg-white/[0.03] border-white/10 text-slate-300'
              }`}
            >
              {f} <span className={filter === f ? 'text-ink-700' : 'text-slate-500'}>{counts[f]}</span>
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">
            {players.length === 0 ? 'No players yet. Import an Excel file or add players one by one.' : 'No players match.'}
          </div>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((p) => {
              const r = auction.records[p.id];
              const team = p.teamId ? state.teams[p.teamId] : r?.teamId ? state.teams[r.teamId] : undefined;
              const st = status(p);
              return (
                <li key={p.id} className="flex gap-3 rounded-xl bg-ink-950/50 border border-white/[0.06] p-2.5">
                  <PlayerPhoto player={p} className="w-14 h-16 rounded-lg shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-white truncate">
                      <span className="text-trophy-300">#{p.number}</span> {p.name}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {p.role}
                      {p.city ? ` · ${p.city}` : ''} · {formatMoney(p.base)}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`chip ${
                          st === 'sold'
                            ? 'bg-pitch-500/15 text-pitch-400'
                            : st === 'unsold'
                            ? 'bg-live-600/15 text-live-400'
                            : st === 'owner'
                            ? 'bg-trophy-500/15 text-trophy-300'
                            : st === 'icon'
                            ? 'bg-pulse-500/15 text-pulse-400'
                            : 'bg-white/5 text-slate-400'
                        }`}
                      >
                        {st}
                      </span>
                      {team && <span className="text-[10px] font-bold text-slate-300 truncate">{team.shortName}</span>}
                      {r?.status === 'SOLD' && <span className="text-[10px] text-slate-400 tabular-nums">{formatMoney(r.price)}</span>}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex flex-col gap-1 shrink-0">
                      <button onClick={() => setEditing(p)} className="w-8 h-8 grid place-items-center rounded-lg bg-white/5" aria-label={`Edit ${p.name}`}>
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm(`Delete ${p.name}? Their auction result is removed too.`)) return;
                          try {
                            await api.deletePlayer(p.id);
                          } catch (err: any) {
                            setMessage({ text: err.message, tone: 'error' });
                          }
                        }}
                        className="w-8 h-8 grid place-items-center rounded-lg bg-white/5 hover:bg-live-600/20"
                        aria-label={`Delete ${p.name}`}
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

      <AnimatePresence>
        {editing && <PlayerForm auction={auction} initial={editing} onClose={() => setEditing(null)} onSaved={(t) => setMessage({ text: t, tone: 'ok' })} />}
        {importPreview && (
          <ImportDialog
            auction={auction}
            preview={importPreview}
            onClose={() => setImportPreview(null)}
            onDone={(t) => {
              setImportPreview(null);
              setMessage({ text: t, tone: 'ok' });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ==========================================
// Sheet wrapper
// ==========================================
const Sheet: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }> = ({ title, onClose, children, footer }) => (
  <motion.div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
    <motion.div
      className="relative w-full sm:max-w-lg max-h-[90dvh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-ink-850 border border-white/10 shadow-2xl pb-safe"
      initial={{ y: 40 }}
      animate={{ y: 0 }}
      exit={{ y: 40 }}
    >
      <div className="shrink-0 px-5 pt-4 pb-3 border-b border-white/[0.06] flex items-center justify-between gap-3">
        <h3 className="font-display text-2xl font-semibold text-white">{title}</h3>
        <button onClick={onClose} className="p-2 rounded-full bg-white/5" aria-label="Close">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
      {footer && <div className="shrink-0 px-5 py-3 border-t border-white/[0.06]">{footer}</div>}
    </motion.div>
  </motion.div>
);

const field = 'w-full h-11 rounded-xl bg-ink-950/60 border border-white/10 px-3 text-sm text-white focus:outline-none focus:border-brand-400';
const label = 'block text-[11px] font-bold text-slate-400 mb-1';

// ==========================================
// Add / edit player
// ==========================================
const PlayerForm: React.FC<{ auction: AuctionState; initial: Partial<AuctionPlayer>; onClose: () => void; onSaved: (msg: string) => void }> = ({
  auction,
  initial,
  onClose,
  onSaved,
}) => {
  const { state } = useCricket();
  const api = useAuctionApi();
  const [form, setForm] = useState<Partial<AuctionPlayer>>(initial);
  const [photo, setPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k: keyof AuctionPlayer, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  const teams = auction.teamIds.map((id) => state.teams[id]).filter(Boolean);

  const save = async () => {
    setError('');
    if (!form.name?.trim() || !String(form.number || '').trim()) return setError('Name and player number are required.');
    if (form.playerType !== 'auction' && !form.teamId) return setError('Owner and icon players need a team.');
    setSaving(true);
    try {
      const saved = await api.savePlayer(form as Record<string, unknown>);
      if (photo) await api.uploadPhoto(saved.id, photo);
      onSaved(`${saved.name} saved.`);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      title={initial.id ? 'Edit player' : 'Add player'}
      onClose={onClose}
      footer={
        <div className="flex items-center gap-2">
          {error && <span className="text-xs text-live-400 flex-1">{error}</span>}
          <button onClick={save} disabled={saving} className="btn-primary ml-auto">
            {saving ? 'Saving…' : 'Save player'}
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <label className="relative cursor-pointer shrink-0">
            {photo ? (
              <img src={photo} alt="" className="w-20 h-24 rounded-xl object-cover" />
            ) : (
              <PlayerPhoto player={initial.id ? (initial as AuctionPlayer) : undefined} className="w-20 h-24 rounded-xl" />
            )}
            <span className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-brand-500 grid place-items-center shadow-lg">
              <Camera className="w-4 h-4 text-white" />
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  setPhoto(await compressImage(f));
                } catch (err: any) {
                  setError(err.message);
                }
              }}
            />
          </label>
          <div className="flex-1 min-w-0">
            <label className={label}>Name *</label>
            <input className={field} value={form.name || ''} onChange={(e) => set('name', e.target.value)} placeholder="Player name" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Player number *</label>
            <input className={field} inputMode="numeric" value={form.number || ''} onChange={(e) => set('number', e.target.value)} />
          </div>
          <div>
            <label className={label}>Village / city</label>
            <input className={field} value={form.city || ''} onChange={(e) => set('city', e.target.value)} />
          </div>
          <div>
            <label className={label}>Role</label>
            <select className={field} value={form.role || 'Batsman'} onChange={(e) => set('role', e.target.value)}>
              {['Batsman', 'Bowler', 'All-rounder', 'Wicketkeeper'].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Base price ₹</label>
            <input className={field} inputMode="numeric" value={form.base ?? ''} onChange={(e) => set('base', e.target.value)} />
          </div>
          <div>
            <label className={label}>Player type</label>
            <select className={field} value={form.playerType || 'auction'} onChange={(e) => set('playerType', e.target.value)}>
              <option value="auction">Auction player</option>
              <option value="owner">Team owner</option>
              <option value="icon">Icon player</option>
            </select>
          </div>
          <div>
            <label className={label}>Team (owner / icon)</label>
            <select className={field} value={form.teamId || ''} onChange={(e) => set('teamId', e.target.value)} disabled={form.playerType === 'auction'}>
              <option value="">Select team</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {(['matches', 'runs', 'wickets'] as const).map((k) => (
            <div key={k}>
              <label className={`${label} capitalize`}>{k}</label>
              <input className={field} inputMode="numeric" value={form[k] ?? ''} onChange={(e) => set(k, e.target.value)} />
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-500">Owners and icons join their team straight away and aren’t auctioned.</p>
      </div>
    </Sheet>
  );
};

// ==========================================
// Import preview + confirm
// ==========================================
const ImportDialog: React.FC<{
  auction: AuctionState;
  preview: { file: string; result: ImportResult };
  onClose: () => void;
  onDone: (msg: string) => void;
}> = ({ auction, preview, onClose, onDone }) => {
  const { state } = useCricket();
  const api = useAuctionApi();
  const { result } = preview;
  const [replace, setReplace] = useState(result.source === 'backup');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  const existingNumbers = new Set(Object.values(auction.players).map((p) => p.number));
  const updates = result.players.filter((p) => existingNumbers.has(p.number)).length;
  const knownTeams = new Set(Object.values(state.teams).map((t) => t.name.toLowerCase()));
  const newTeams = result.teams.filter((t) => !knownTeams.has(t.name.toLowerCase()));
  const byType = {
    auction: result.players.filter((p) => p.playerType === 'auction').length,
    owner: result.players.filter((p) => p.playerType === 'owner').length,
    icon: result.players.filter((p) => p.playerType === 'icon').length,
  };
  const withPhotos = result.players.filter((p) => p.photoData).length;

  const run = async () => {
    if (replace && Object.keys(auction.players).length && !confirm('Replace all current auction players and results with this file?')) return;
    setRunning(true);
    setError('');
    try {
      setProgress('Importing players and teams…');
      const { summary } = await api.importData({
        teams: result.teams,
        players: result.players.map(({ photoData, ...p }) => p),
        replace,
        ...(result.extras || {}),
      });
      // Photos from a backup file are uploaded one by one
      const photos = result.players.filter((p) => p.photoData && p.sourceId && summary.idMap[p.sourceId]);
      for (const [i, p] of photos.entries()) {
        setProgress(`Uploading photos ${i + 1} / ${photos.length}…`);
        try {
          await api.uploadPhoto(summary.idMap[p.sourceId!], await compressImage(p.photoData!));
        } catch {
          // keep going; the player is imported without a photo
        }
      }
      const parts = [
        `${summary.playersCreated} players added`,
        summary.playersUpdated ? `${summary.playersUpdated} updated` : '',
        summary.teamsCreated ? `${summary.teamsCreated} teams created` : '',
        summary.skipped.length ? `${summary.skipped.length} rows skipped` : '',
      ].filter(Boolean);
      onDone(`Import done: ${parts.join(', ')}.`);
    } catch (err: any) {
      setError(err.message);
      setRunning(false);
    }
  };

  return (
    <Sheet
      title="Review import"
      onClose={running ? () => {} : onClose}
      footer={
        <div className="flex items-center gap-2">
          {error ? <span className="text-xs text-live-400 flex-1">{error}</span> : progress && <span className="text-xs text-slate-400 flex-1">{progress}</span>}
          <button onClick={run} disabled={running} className="btn-primary ml-auto">
            {running ? 'Importing…' : `Import ${result.players.length} players`}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="text-xs text-slate-400 truncate">{preview.file}</div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-white/[0.04] p-2">
            <div className="font-display text-3xl text-white">{byType.auction}</div>
            <div className="text-[10px] font-bold text-slate-500 uppercase">Auction</div>
          </div>
          <div className="rounded-xl bg-white/[0.04] p-2">
            <div className="font-display text-3xl text-trophy-300">{byType.owner + byType.icon}</div>
            <div className="text-[10px] font-bold text-slate-500 uppercase">Owners & icons</div>
          </div>
          <div className="rounded-xl bg-white/[0.04] p-2">
            <div className="font-display text-3xl text-brand-300">{result.teams.length}</div>
            <div className="text-[10px] font-bold text-slate-500 uppercase">Teams</div>
          </div>
        </div>
        <ul className="text-xs text-slate-300 space-y-1">
          {newTeams.length > 0 && <li>• New teams: {newTeams.map((t) => t.name).join(', ')}</li>}
          {updates > 0 && !replace && <li>• {updates} player(s) already exist (same number) and will be updated</li>}
          {withPhotos > 0 && <li>• {withPhotos} photo(s) will be uploaded</li>}
          {result.source === 'backup' && <li>• Sold / unsold results and rules from the backup are included</li>}
          {result.warnings.map((w) => (
            <li key={w} className="text-trophy-300">• {w}</li>
          ))}
        </ul>

        <div className="rounded-xl border border-white/10 overflow-hidden">
          <div className="max-h-56 overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-ink-800 text-slate-400">
                <tr>
                  <th className="text-left px-2 py-1.5">No.</th>
                  <th className="text-left px-2 py-1.5">Name</th>
                  <th className="text-left px-2 py-1.5">Role</th>
                  <th className="text-left px-2 py-1.5">Type / team</th>
                  <th className="text-right px-2 py-1.5">Base</th>
                </tr>
              </thead>
              <tbody>
                {result.players.slice(0, 100).map((p, i) => (
                  <tr key={i} className="border-t border-white/[0.05]">
                    <td className="px-2 py-1.5 tabular-nums">{p.number}</td>
                    <td className="px-2 py-1.5 font-semibold text-white">{p.name}</td>
                    <td className="px-2 py-1.5">{p.role || '—'}</td>
                    <td className="px-2 py-1.5">{p.playerType === 'auction' ? 'Auction' : `${p.playerType} · ${p.team || '—'}`}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{p.base !== undefined ? formatMoney(p.base) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.players.length > 100 && <div className="px-2 py-1.5 text-[11px] text-slate-500 border-t border-white/[0.05]">…and {result.players.length - 100} more</div>}
        </div>

        <div className="space-y-2">
          <label className="flex items-start gap-2 text-sm text-slate-200 cursor-pointer">
            <input type="radio" checked={!replace} onChange={() => setReplace(false)} className="mt-1 accent-cyan-400" />
            <span>
              <strong>Add & update</strong>
              <span className="block text-[11px] text-slate-500">Keeps current players and results; players with the same number are updated.</span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm text-slate-200 cursor-pointer">
            <input type="radio" checked={replace} onChange={() => setReplace(true)} className="mt-1 accent-cyan-400" />
            <span>
              <strong>Replace everything</strong>
              <span className="block text-[11px] text-slate-500">Removes all current auction players and results first. Teams are kept.</span>
            </span>
          </label>
        </div>
      </div>
    </Sheet>
  );
};
