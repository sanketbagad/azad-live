import { SheetBackdrop } from '../ui/SheetBackdrop';
import React, { useState } from 'react';
import { BroadcastSponsor } from '../../types/cricket';
import { defaultBroadcastSponsors } from './SponsorOverlayBug';
import { ShieldCheck, Plus, Trash2, Eye, EyeOff, X, Save, Sliders } from 'lucide-react';

interface SponsorControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateSponsors: (sponsors: BroadcastSponsor[]) => void;
  currentSponsors?: BroadcastSponsor[];
}

export const SponsorControlModal: React.FC<SponsorControlModalProps> = ({
  isOpen,
  onClose,
  onUpdateSponsors,
  currentSponsors = defaultBroadcastSponsors,
}) => {
  const [sponsors, setSponsors] = useState<BroadcastSponsor[]>(currentSponsors);
  const [newSponsorName, setNewSponsorName] = useState('');
  const [newTagline, setNewTagline] = useState('');
  const [newPlacement, setNewPlacement] = useState<BroadcastSponsor['placement']>('top_right');

  if (!isOpen) return null;

  const handleToggle = (id: string) => {
    const updated = sponsors.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s));
    setSponsors(updated);
    onUpdateSponsors(updated);
  };

  const handleDelete = (id: string) => {
    const updated = sponsors.filter((s) => s.id !== id);
    setSponsors(updated);
    onUpdateSponsors(updated);
  };

  const handleAddSponsor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSponsorName.trim()) return;

    const newSponsor: BroadcastSponsor = {
      id: 'sp_' + Date.now(),
      name: newSponsorName.trim().toUpperCase(),
      tagline: newTagline.trim() || undefined,
      placement: newPlacement,
      enabled: true,
    };

    const updated = [...sponsors, newSponsor];
    setSponsors(updated);
    onUpdateSponsors(updated);
    setNewSponsorName('');
    setNewTagline('');
  };

  return (
    <SheetBackdrop>
      <div className="card sheet max-w-xl overflow-hidden flex flex-col pt-3">
        {/* Header */}
        <div className="bg-ink-950/60 px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-white text-base">Broadcast Sponsor Manager</h3>
              <p className="text-xs text-slate-400">
                Configure sponsor logos and bug placements across all PRISM & OBS overlays
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.05]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-6 overflow-y-auto">
          {/* Active Sponsors List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Active Broadcast Sponsors ({sponsors.length})
            </h4>

            {sponsors.length === 0 ? (
              <div className="p-4 rounded-xl bg-ink-950/60 border border-white/[0.06] text-center text-xs text-slate-500 italic">
                No sponsors added. Add title or associate sponsors below.
              </div>
            ) : (
              <div className="space-y-2">
                {sponsors.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-ink-950/60 border border-white/[0.06] hover:border-white/10 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={() => handleToggle(s.id)}
                        className={`p-1.5 rounded-lg text-xs font-bold flex items-center space-x-1 ${
                          s.enabled
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700'
                            : 'bg-white/[0.05] text-slate-500 border border-white/10'
                        }`}
                        title={s.enabled ? 'Enabled - Click to disable' : 'Disabled - Click to enable'}
                      >
                        {s.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>

                      <div>
                        <div className="text-sm font-black text-white">{s.name}</div>
                        <div className="text-[11px] text-amber-400 font-medium">
                          {s.placement.replace('_', ' ').toUpperCase()}
                          {s.tagline ? ` • ${s.tagline}` : ''}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(s.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40"
                      title="Remove Sponsor"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add New Sponsor Form */}
          <form onSubmit={handleAddSponsor} className="bg-ink-950/80 border border-white/[0.06] rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-cyan-400" />
              <span>Add New Sponsor / Bug</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Sponsor Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. AZAD TELECOM"
                  value={newSponsorName}
                  onChange={(e) => setNewSponsorName(e.target.value)}
                  className="w-full bg-ink-850 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-400 font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Tagline / Subtitle
                </label>
                <input
                  type="text"
                  placeholder="e.g. Official Powered By"
                  value={newTagline}
                  onChange={(e) => setNewTagline(e.target.value)}
                  className="w-full bg-ink-850 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-400 font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Overlay Placement
              </label>
              <select
                value={newPlacement}
                onChange={(e) => setNewPlacement(e.target.value as any)}
                className="w-full bg-ink-850 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-400 font-semibold"
              >
                <option value="top_right">Top Right (Corner Bug Banner)</option>
                <option value="bottom_ticker">Bottom Ticker (Live Score Strip)</option>
                <option value="scorecard_header">Scorecard Header (Associate Badge)</option>
                <option value="corner_bug">Mini Corner Bug (Compact)</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-brand-500 to-pulse-500 hover:brightness-110 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Sponsor to Overlays</span>
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="bg-ink-950/60 px-5 py-3 border-t border-white/[0.06] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs"
          >
            Done & Save Settings
          </button>
        </div>
      </div>
    </SheetBackdrop>
  );
};
