import { SheetBackdrop } from './ui/SheetBackdrop';
import React, { useState } from 'react';
import { BallType, Match, Team } from '../types/cricket';
import { useCricket } from '../context/CricketContext';
import { X, Zap, Trophy, Shield, Calendar, MapPin, Users } from 'lucide-react';

interface QuickMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMatchCreated: (match: Match) => void;
}

export const QuickMatchModal: React.FC<QuickMatchModalProps> = ({
  isOpen,
  onClose,
  onMatchCreated,
}) => {
  const { state, createMatch } = useCricket();

  const [matchName, setMatchName] = useState('');
  const [ballType, setBallType] = useState<BallType>('leather');
  const [overs, setOvers] = useState<number>(10);
  const [oversPerBowler, setOversPerBowler] = useState<number>(2);
  const [venue, setVenue] = useState('Ground 1');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Teams come from Teams & Players; matches can only be created between real squads
  const existingTeams = Object.values(state.teams);
  const [team1Id, setTeam1Id] = useState<string>('');
  const [team2Id, setTeam2Id] = useState<string>('');

  // Toss
  const [tossWinner, setTossWinner] = useState<'team1' | 'team2'>('team1');
  const [tossDecision, setTossDecision] = useState<'bat' | 'bowl'>('bat');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const team1 = state.teams[team1Id];
      const team2 = state.teams[team2Id];
      if (!team1 || !team2) {
        throw new Error('Please select both teams.');
      }
      if (team1.id === team2.id) {
        throw new Error('Team 1 and Team 2 must be different teams.');
      }
      for (const team of [team1, team2]) {
        if (team.squad.length < 2) {
          throw new Error(`${team.name} needs at least 2 players. Add the squad in Teams & Players first.`);
        }
      }

      const match = await createMatch({
        name: matchName || `${team1.name} vs ${team2.name}`,
        stage: 'Quick Match',
        ballType,
        overs: Number(overs),
        oversPerBowler: Number(oversPerBowler),
        venue,
        date,
        team1,
        team2,
        toss: {
          wonById: tossWinner === 'team1' ? team1.id : team2.id,
          wonByName: tossWinner === 'team1' ? team1.name : team2.name,
          decision: tossDecision,
        },
      });

      onMatchCreated(match);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create match');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SheetBackdrop>
      <div className="card sheet max-w-xl px-4 pt-4 sm:px-6 sm:pt-6 sm:pb-6 space-y-4 sm:space-y-5 overflow-y-auto">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-semibold tracking-wide leading-none text-white">Create Quick Match</h2>
              <p className="text-xs text-slate-400">Universal Match Setup (Leather, Tennis & Light Tennis)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/[0.05] text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-950/80 border border-rose-700/60 rounded-xl text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Match Name */}
          <div>
            <label className="font-bold text-slate-300 uppercase block mb-1">
              Match Name (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Friendly T10 Shootout"
              value={matchName}
              onChange={(e) => setMatchName(e.target.value)}
              className="w-full bg-white/[0.05] border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-brand-400"
            />
          </div>

          {/* CRITICAL REQUIREMENT 2: Ball Type Selector */}
          <div>
            <label className="font-bold text-slate-300 uppercase block mb-1.5 flex items-center justify-between">
              <span>Ball Type (Standard Cricket Specification)</span>
              <span className="text-[10px] text-cyan-400 normal-case">All 3 ball types supported</span>
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 'leather', label: 'Leather Ball', icon: '🔴', desc: 'Standard club / turf ball' },
                { id: 'tennis', label: 'Tennis Ball', icon: '🎾', desc: 'Heavy / hard tennis ball' },
                { id: 'light_tennis', label: 'Light Tennis Ball', icon: '🟡', desc: 'Wind ball / gully box' },
              ].map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBallType(b.id as BallType)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    ballType === b.id
                      ? 'bg-gradient-to-br from-cyan-950 to-blue-950 border-cyan-500 ring-1 ring-cyan-500 shadow-md'
                      : 'bg-white/[0.05] border-white/10 text-slate-300 hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="text-xl mb-1">{b.icon}</div>
                  <div className="font-bold text-white text-xs">{b.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{b.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Overs & Overs Per Bowler */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-300 uppercase block mb-1">
                Total Overs
              </label>
              <select
                value={overs}
                onChange={(e) => {
                  const ov = Number(e.target.value);
                  setOvers(ov);
                  setOversPerBowler(Math.ceil(ov / 5));
                }}
                className="w-full bg-white/[0.05] border border-white/10 rounded-xl p-2.5 text-sm text-white"
              >
                <option value={5}>5 Overs (Blitz / Box)</option>
                <option value={8}>8 Overs (Tennis Super 8)</option>
                <option value={10}>10 Overs (T10 Blast)</option>
                <option value={12}>12 Overs</option>
                <option value={15}>15 Overs</option>
                <option value={20}>20 Overs (Standard T20)</option>
                <option value={50}>50 Overs (One Day)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-300 uppercase block mb-1">
                Max Overs / Bowler
              </label>
              <input
                type="number"
                min={1}
                max={overs}
                value={oversPerBowler}
                onChange={(e) => setOversPerBowler(Number(e.target.value))}
                className="w-full bg-white/[0.05] border border-white/10 rounded-xl p-2.5 text-sm text-white"
              />
            </div>
          </div>

          {/* Teams Selection */}
          {existingTeams.length < 2 && (
            <div className="p-3 bg-amber-950/60 border border-amber-700/50 rounded-xl text-xs text-amber-200">
              You need at least two teams to create a match. Add teams and their players in Teams &amp; Players first.
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/[0.06]">
            {/* Team 1 */}
            <div className="p-3 bg-ink-950/60 border border-white/[0.06] rounded-xl space-y-2">
              <label className="font-bold text-slate-300 uppercase block">Team 1</label>
              <select
                value={team1Id}
                onChange={(e) => setTeam1Id(e.target.value)}
                required
                className="w-full bg-white/[0.05] border border-white/10 rounded-lg p-2 text-xs text-white"
              >
                <option value="">Select team…</option>
                {existingTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.shortName}) · {t.squad.length} players
                  </option>
                ))}
              </select>
            </div>

            {/* Team 2 */}
            <div className="p-3 bg-ink-950/60 border border-white/[0.06] rounded-xl space-y-2">
              <label className="font-bold text-slate-300 uppercase block">Team 2</label>
              <select
                value={team2Id}
                onChange={(e) => setTeam2Id(e.target.value)}
                required
                className="w-full bg-white/[0.05] border border-white/10 rounded-lg p-2 text-xs text-white"
              >
                <option value="">Select team…</option>
                {existingTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.shortName}) · {t.squad.length} players
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Toss Setup */}
          <div className="p-3 bg-ink-950/60 border border-white/[0.06] rounded-xl space-y-2">
            <label className="font-bold text-slate-300 uppercase block">
              Match Toss
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[11px] text-slate-400 block mb-1">Toss Won By:</span>
                <select
                  value={tossWinner}
                  onChange={(e) => setTossWinner(e.target.value as 'team1' | 'team2')}
                  className="w-full bg-white/[0.05] border border-white/10 rounded-lg p-2 text-xs text-white"
                >
                  <option value="team1">Team 1</option>
                  <option value="team2">Team 2</option>
                </select>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block mb-1">Elected To:</span>
                <select
                  value={tossDecision}
                  onChange={(e) => setTossDecision(e.target.value as 'bat' | 'bowl')}
                  className="w-full bg-white/[0.05] border border-white/10 rounded-lg p-2 text-xs text-white"
                >
                  <option value="bat">Bat First</option>
                  <option value="bowl">Bowl First</option>
                </select>
              </div>
            </div>
          </div>

          {/* Venue & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-300 uppercase block mb-1">Venue</label>
              <input
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="Ground name"
                className="w-full bg-white/[0.05] border border-white/10 rounded-xl p-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="font-bold text-slate-300 uppercase block mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white/[0.05] border border-white/10 rounded-xl p-2 text-xs text-white"
              />
            </div>
          </div>

          <div className="flex space-x-3 pt-3 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/10 text-slate-300 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-sm font-bold shadow-lg shadow-emerald-950/50 flex items-center justify-center space-x-1.5"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>{isSubmitting ? 'Creating...' : 'Start Match & Score'}</span>
            </button>
          </div>
        </form>
      </div>
    </SheetBackdrop>
  );
};
