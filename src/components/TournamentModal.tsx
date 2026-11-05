import { SheetBackdrop } from './ui/SheetBackdrop';
import React, { useState } from 'react';
import { BallType, Tournament } from '../types/cricket';
import { useCricket } from '../context/CricketContext';
import { X, Trophy, Plus, Trash2, Calendar, Check, Layers } from 'lucide-react';

interface TournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTournamentCreated?: (t: Tournament) => void;
}

export const TournamentModal: React.FC<TournamentModalProps> = ({
  isOpen,
  onClose,
  onTournamentCreated,
}) => {
  const { state, createTournament, createMatch } = useCricket();

  const [name, setName] = useState('');
  const [season, setSeason] = useState('2026');
  const [format, setFormat] = useState<'league' | 'group_knockout' | 'knockout' | 'custom'>('group_knockout');
  const [ballType, setBallType] = useState<BallType>('leather');
  const [overs, setOvers] = useState<number>(10);

  // Selected teams for tournament
  const allTeams = Object.values(state.teams);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(allTeams.map((t) => t.id));

  // Groups
  const [groups, setGroups] = useState<{ id: string; name: string; teamIds: string[] }[]>([
    { id: 'grp_a', name: 'Group A', teamIds: [] },
    { id: 'grp_b', name: 'Group B', teamIds: [] },
  ]);

  const [generateFixturesAuto, setGenerateFixturesAuto] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleToggleTeam = (teamId: string) => {
    if (selectedTeamIds.includes(teamId)) {
      setSelectedTeamIds(selectedTeamIds.filter((id) => id !== teamId));
    } else {
      setSelectedTeamIds([...selectedTeamIds, teamId]);
    }
  };

  const handleAddGroup = () => {
    const nextLetter = String.fromCharCode(65 + groups.length); // C, D, etc.
    setGroups([
      ...groups,
      { id: `grp_${Date.now()}`, name: `Group ${nextLetter}`, teamIds: [] },
    ]);
  };

  const handleRemoveGroup = (groupId: string) => {
    if (groups.length <= 1) return;
    setGroups(groups.filter((g) => g.id !== groupId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a tournament name.');
      return;
    }
    if (selectedTeamIds.length < 2) {
      setError('Select at least 2 teams for the tournament.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Auto-assign teams to groups if group_knockout
      let finalGroups = groups;
      if (format === 'group_knockout') {
        const updatedGroups = groups.map((g) => ({ ...g, teamIds: [] as string[] }));
        selectedTeamIds.forEach((tId, idx) => {
          const targetGroupIdx = idx % groups.length;
          updatedGroups[targetGroupIdx].teamIds.push(tId);
        });
        finalGroups = updatedGroups;
      } else {
        finalGroups = [{ id: 'grp_all', name: 'All Teams', teamIds: selectedTeamIds }];
      }

      const created = await createTournament({
        name,
        season,
        format,
        ballType,
        overs: Number(overs),
        teamIds: selectedTeamIds,
        groups: finalGroups,
      });

      // Auto generate fixtures if checked
      if (generateFixturesAuto) {
        if (format === 'league') {
          // Round robin all vs all
          for (let i = 0; i < selectedTeamIds.length; i++) {
            for (let j = i + 1; j < selectedTeamIds.length; j++) {
              const t1 = state.teams[selectedTeamIds[i]];
              const t2 = state.teams[selectedTeamIds[j]];
              if (t1 && t2) {
                await createMatch({
                  name: `${t1.shortName} vs ${t2.shortName}`,
                  tournamentId: created.id,
                  tournamentName: created.name,
                  stage: 'League Match',
                  ballType,
                  overs,
                  team1: t1,
                  team2: t2,
                  venue: 'Main Ground',
                });
              }
            }
          }
        } else if (format === 'group_knockout') {
          // Fixtures within each group
          for (const grp of finalGroups) {
            const grpTeams = grp.teamIds;
            for (let i = 0; i < grpTeams.length; i++) {
              for (let j = i + 1; j < grpTeams.length; j++) {
                const t1 = state.teams[grpTeams[i]];
                const t2 = state.teams[grpTeams[j]];
                if (t1 && t2) {
                  await createMatch({
                    name: `${t1.shortName} vs ${t2.shortName}`,
                    tournamentId: created.id,
                    tournamentName: created.name,
                    stage: grp.name,
                    ballType,
                    overs,
                    team1: t1,
                    team2: t2,
                    venue: 'Ground 1',
                  });
                }
              }
            }
          }
        }
      }

      onTournamentCreated?.(created);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create tournament');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SheetBackdrop>
      <div className="card sheet max-w-xl px-4 pt-4 sm:px-6 sm:pt-6 sm:pb-6 space-y-4 sm:space-y-5 overflow-y-auto">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-semibold tracking-wide leading-none text-white">Create Cricket Tournament</h2>
              <p className="text-xs text-slate-400">Universal Formats, Groups & Fixture Generator</p>
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
          {/* Tournament Name & Season */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="font-bold text-slate-300 uppercase block mb-1">
                Tournament Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. City Champions Cup"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/[0.05] border border-white/10 rounded-xl p-2.5 text-sm text-white"
              />
            </div>
            <div>
              <label className="font-bold text-slate-300 uppercase block mb-1">Season</label>
              <input
                type="text"
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                className="w-full bg-white/[0.05] border border-white/10 rounded-xl p-2.5 text-sm text-white"
              />
            </div>
          </div>

          {/* Tournament Format */}
          <div>
            <label className="font-bold text-slate-300 uppercase block mb-1.5">
              Tournament Format
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'group_knockout', label: 'Group + Knockout', sub: 'Groups, Semis, Final' },
                { id: 'league', label: 'Round Robin', sub: 'Single table league' },
                { id: 'knockout', label: 'Direct Knockout', sub: 'Brackets play' },
                { id: 'custom', label: 'Custom Fixtures', sub: 'Manual match additions' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFormat(f.id as any)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    format === f.id
                      ? 'bg-blue-600/30 border-blue-500 text-white'
                      : 'bg-white/[0.05] text-slate-300 border-white/10'
                  }`}
                >
                  <div className="font-bold text-xs">{f.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{f.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Ball Type & Overs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-300 uppercase block mb-1">Ball Type</label>
              <select
                value={ballType}
                onChange={(e) => setBallType(e.target.value as BallType)}
                className="w-full bg-white/[0.05] border border-white/10 rounded-xl p-2.5 text-xs text-white"
              >
                <option value="leather">🔴 Leather Ball (Standard)</option>
                <option value="tennis">🎾 Tennis Ball (Heavy)</option>
                <option value="light_tennis">🟡 Light Tennis Ball (Wind)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-300 uppercase block mb-1">Overs / Match</label>
              <select
                value={overs}
                onChange={(e) => setOvers(Number(e.target.value))}
                className="w-full bg-white/[0.05] border border-white/10 rounded-xl p-2.5 text-xs text-white"
              >
                <option value={5}>5 Overs</option>
                <option value={8}>8 Overs</option>
                <option value={10}>10 Overs (T10)</option>
                <option value={15}>15 Overs</option>
                <option value={20}>20 Overs (T20)</option>
              </select>
            </div>
          </div>

          {/* Groups management (if Group Stage) */}
          {format === 'group_knockout' && (
            <div className="p-3 bg-ink-950/60 border border-white/[0.06] rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-300 uppercase">
                  Tournament Groups
                </label>
                <button
                  type="button"
                  onClick={handleAddGroup}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Group</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {groups.map((grp) => (
                  <div
                    key={grp.id}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-xs text-white"
                  >
                    <span>{grp.name}</span>
                    {groups.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveGroup(grp.id)}
                        className="p-0.5 text-slate-400 hover:text-rose-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Select participating teams */}
          <div className="p-3 bg-ink-950/60 border border-white/[0.06] rounded-xl space-y-2">
            <label className="font-bold text-slate-300 uppercase block">
              Select Participating Teams ({selectedTeamIds.length} selected)
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto">
              {allTeams.map((team) => {
                const isSelected = selectedTeamIds.includes(team.id);
                return (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => handleToggleTeam(team.id)}
                    className={`p-2 rounded-lg text-left text-xs font-semibold flex items-center justify-between border ${
                      isSelected
                        ? 'bg-blue-600/30 border-blue-500 text-white'
                        : 'bg-white/[0.05] border-white/10 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: team.color }} />
                      <span className="truncate">{team.name}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Auto-generate fixtures option */}
          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="fixturesAuto"
              checked={generateFixturesAuto}
              onChange={(e) => setGenerateFixturesAuto(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 bg-white/[0.05] border-white/10"
            />
            <label htmlFor="fixturesAuto" className="text-xs text-slate-300 font-medium cursor-pointer">
              Automatically generate round-robin fixture schedule for selected teams
            </label>
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
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-pulse-500 hover:brightness-110 text-white text-sm font-bold shadow-lg shadow-blue-900/40 flex items-center justify-center space-x-1.5"
            >
              <Trophy className="w-4 h-4" />
              <span>{isSubmitting ? 'Creating...' : 'Create Tournament'}</span>
            </button>
          </div>
        </form>
      </div>
    </SheetBackdrop>
  );
};
