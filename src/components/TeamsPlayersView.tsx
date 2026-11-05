import { SheetBackdrop } from './ui/SheetBackdrop';
import React, { useState } from 'react';
import { useCricket } from '../context/CricketContext';
import { usePermissions } from '../auth/permissions';
import { Player, Team } from '../types/cricket';
import { Users, Plus, Shield, Award, Edit2, Check, X, Search, Sparkles } from 'lucide-react';

export const TeamsPlayersView: React.FC = () => {
  const { state, createTeam, createPlayer } = useCricket();
  const { can } = usePermissions();
  const teams = Object.values(state.teams);
  const players = Object.values(state.players);

  const [selectedTeamId, setSelectedTeamId] = useState<string>(teams[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  // New Team Modal
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamShort, setNewTeamShort] = useState('');
  const [newTeamColor, setNewTeamColor] = useState('#2563EB');
  const [newTeamCity, setNewTeamCity] = useState('');

  // New Player Modal
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerRole, setNewPlayerRole] = useState<Player['role']>('batter');
  const [newPlayerBattingStyle, setNewPlayerBattingStyle] = useState<Player['battingStyle']>('right_hand');
  const [newPlayerBowlingStyle, setNewPlayerBowlingStyle] = useState<Player['bowlingStyle']>('right_arm_medium');

  const selectedTeam = state.teams[selectedTeamId] || teams[0];

  const filteredPlayers = players.filter(
    (p) =>
      (!selectedTeamId || p.teamId === selectedTeamId) &&
      (p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.role.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCreateTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName) return;
    const team: Team = {
      id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      name: newTeamName,
      shortName: newTeamShort || newTeamName.slice(0, 3).toUpperCase(),
      color: newTeamColor,
      city: newTeamCity,
      squad: [],
    };
    await createTeam(team);
    setSelectedTeamId(team.id);
    setShowAddTeamModal(false);
    setNewTeamName('');
    setNewTeamShort('');
  };

  const handleCreatePlayerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName) return;
    const player: Player = {
      id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      name: newPlayerName,
      teamId: selectedTeamId,
      role: newPlayerRole,
      battingStyle: newPlayerBattingStyle,
      bowlingStyle: newPlayerBowlingStyle,
      careerStats: {
        matches: 0,
        innings: 0,
        runs: 0,
        balls: 0,
        highestScore: 0,
        fours: 0,
        sixes: 0,
        fifties: 0,
        hundreds: 0,
        wickets: 0,
        oversBowled: 0,
        runsConceded: 0,
        maidens: 0,
        bestBowling: '0/0',
        catches: 0,
        runOuts: 0,
        stumpings: 0,
        mvpPoints: 0,
      },
    };
    await createPlayer(player);
    setShowAddPlayerModal(false);
    setNewPlayerName('');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="card p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage clubs, squads, player statistics, and career performances
          </p>
        </div>

        {can('team.manage') && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAddTeamModal(true)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-brand-500 to-pulse-500 hover:brightness-110 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Team</span>
            </button>
            <button
              onClick={() => setShowAddPlayerModal(true)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-brand-500 to-pulse-500 hover:brightness-110 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Player</span>
            </button>
          </div>
        )}
      </div>

      {/* Team Selection Pills */}
      <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none">
        {teams.map((t) => {
          const isSelected = selectedTeamId === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSelectedTeamId(t.id)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl border text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? 'bg-white/[0.05] border-cyan-500 text-white shadow-md'
                  : 'bg-ink-850 border-white/[0.06] text-slate-400 hover:text-white'
              }`}
            >
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
              <span>{t.name}</span>
              <span className="text-[10px] text-slate-400 font-mono">({t.squad?.length || 0})</span>
            </button>
          );
        })}
      </div>

      {/* Search & Player Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Squad Players List */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center space-x-2 card !rounded-xl px-3 py-2 text-xs text-slate-300">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search player by name or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none text-xs text-white focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredPlayers.length === 0 ? (
              <div className="col-span-2 p-8 text-center text-slate-500 italic bg-ink-850 rounded-xl border border-white/[0.06] text-xs">
                No players match your search.
              </div>
            ) : (
              filteredPlayers.map((player) => (
                <div
                  key={player.id}
                  onClick={() => setSelectedPlayer(player)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    selectedPlayer?.id === player.id
                      ? 'bg-cyan-950/40 border-cyan-500 shadow-md ring-1 ring-cyan-500/50'
                      : 'bg-ink-850 border-white/[0.06] hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center text-cyan-400 font-black text-sm">
                      {player.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <div className="font-bold text-sm text-white truncate">{player.name}</div>
                        {player.auctionStatus === 'SOLD' && (
                          <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-700/60 px-1.5 py-0.2 rounded shrink-0">
                            SOLD ₹{player.soldPrice?.toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-cyan-400 capitalize font-medium">
                        {player.role.replace('_', ' ')}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Bat: {player.battingStyle.replace('_', ' ')} • Bowl:{' '}
                        {player.bowlingStyle.replace(/_/g, ' ')}
                      </div>
                    </div>
                  </div>

                  {/* Mini Stats Bar */}
                  <div className="mt-3 pt-2.5 border-t border-white/[0.06] grid grid-cols-3 gap-2 text-center text-[11px] font-mono">
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase">Runs</span>
                      <strong className="text-white">{player.careerStats.runs}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase">Wkts</span>
                      <strong className="text-amber-400">{player.careerStats.wickets}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase">MVP Pts</span>
                      <strong className="text-cyan-400">{player.careerStats.mvpPoints}</strong>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Selected Player Detailed Profile */}
        <div>
          {selectedPlayer ? (
            <div className="card p-5 shadow-xl space-y-4 sticky top-28">
              <div className="flex items-center space-x-3 border-b border-white/[0.06] pb-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-extrabold text-xl shadow-lg">
                  {selectedPlayer.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">{selectedPlayer.name}</h3>
                  <div className="text-xs text-cyan-400 font-semibold capitalize">
                    {selectedPlayer.role.replace('_', ' ')}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {state.teams[selectedPlayer.teamId || '']?.name || 'Club Cricket'}
                  </div>
                </div>
              </div>

              {/* Batting Career Breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Batting Career
                </h4>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded bg-ink-950/60 border border-white/[0.06]">
                    <span className="text-[10px] text-slate-400 block">Matches</span>
                    <strong className="font-mono text-white text-sm">
                      {selectedPlayer.careerStats.matches}
                    </strong>
                  </div>
                  <div className="p-2 rounded bg-ink-950/60 border border-white/[0.06]">
                    <span className="text-[10px] text-slate-400 block">Runs</span>
                    <strong className="font-mono text-cyan-400 text-sm">
                      {selectedPlayer.careerStats.runs}
                    </strong>
                  </div>
                  <div className="p-2 rounded bg-ink-950/60 border border-white/[0.06]">
                    <span className="text-[10px] text-slate-400 block">High Score</span>
                    <strong className="font-mono text-white text-sm">
                      {selectedPlayer.careerStats.highestScore}
                    </strong>
                  </div>
                  <div className="p-2 rounded bg-ink-950/60 border border-white/[0.06]">
                    <span className="text-[10px] text-slate-400 block">4s / 6s</span>
                    <strong className="font-mono text-slate-300 text-xs">
                      {selectedPlayer.careerStats.fours} / {selectedPlayer.careerStats.sixes}
                    </strong>
                  </div>
                  <div className="p-2 rounded bg-ink-950/60 border border-white/[0.06]">
                    <span className="text-[10px] text-slate-400 block">50s / 100s</span>
                    <strong className="font-mono text-slate-300 text-xs">
                      {selectedPlayer.careerStats.fifties} / {selectedPlayer.careerStats.hundreds}
                    </strong>
                  </div>
                  <div className="p-2 rounded bg-ink-950/60 border border-white/[0.06]">
                    <span className="text-[10px] text-slate-400 block">Strike Rate</span>
                    <strong className="font-mono text-amber-400 text-xs">
                      {selectedPlayer.careerStats.balls > 0
                        ? ((selectedPlayer.careerStats.runs / selectedPlayer.careerStats.balls) * 100).toFixed(1)
                        : '0.0'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Bowling Career Breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Bowling & Fielding
                </h4>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded bg-ink-950/60 border border-white/[0.06]">
                    <span className="text-[10px] text-slate-400 block">Wickets</span>
                    <strong className="font-mono text-purple-400 text-sm">
                      {selectedPlayer.careerStats.wickets}
                    </strong>
                  </div>
                  <div className="p-2 rounded bg-ink-950/60 border border-white/[0.06]">
                    <span className="text-[10px] text-slate-400 block">Best Bowl</span>
                    <strong className="font-mono text-white text-xs">
                      {selectedPlayer.careerStats.bestBowling || '-'}
                    </strong>
                  </div>
                  <div className="p-2 rounded bg-ink-950/60 border border-white/[0.06]">
                    <span className="text-[10px] text-slate-400 block">Overs</span>
                    <strong className="font-mono text-slate-300 text-xs">
                      {selectedPlayer.careerStats.oversBowled}
                    </strong>
                  </div>
                  <div className="p-2 rounded bg-ink-950/60 border border-white/[0.06]">
                    <span className="text-[10px] text-slate-400 block">Catches</span>
                    <strong className="font-mono text-emerald-400 text-xs">
                      {selectedPlayer.careerStats.catches}
                    </strong>
                  </div>
                  <div className="p-2 rounded bg-ink-950/60 border border-white/[0.06]">
                    <span className="text-[10px] text-slate-400 block">Run Outs</span>
                    <strong className="font-mono text-slate-300 text-xs">
                      {selectedPlayer.careerStats.runOuts}
                    </strong>
                  </div>
                  <div className="p-2 rounded bg-ink-950/60 border border-white/[0.06]">
                    <span className="text-[10px] text-slate-400 block">Stumpings</span>
                    <strong className="font-mono text-slate-300 text-xs">
                      {selectedPlayer.careerStats.stumpings}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-8 text-center text-slate-500 text-xs">
              Select any player card on the left to inspect their detailed career profile.
            </div>
          )}
        </div>
      </div>

      {/* ADD TEAM MODAL */}
      {showAddTeamModal && (
        <SheetBackdrop>
          <div className="card sheet max-w-md px-6 pt-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-base font-black text-white">Create New Cricket Team</h3>
              <button onClick={() => setShowAddTeamModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTeamSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-300 uppercase block mb-1">Team Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pune Warriors"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl p-2.5 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-300 uppercase block mb-1">Short Code</label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="e.g. PW"
                    value={newTeamShort}
                    onChange={(e) => setNewTeamShort(e.target.value.toUpperCase())}
                    className="w-full bg-white/[0.05] border border-white/10 rounded-xl p-2.5 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-300 uppercase block mb-1">Color</label>
                  <input
                    type="color"
                    value={newTeamColor}
                    onChange={(e) => setNewTeamColor(e.target.value)}
                    className="w-full h-10 bg-white/[0.05] border border-white/10 rounded-xl cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-300 uppercase block mb-1">City / Region</label>
                <input
                  type="text"
                  placeholder="e.g. Pune"
                  value={newTeamCity}
                  onChange={(e) => setNewTeamCity(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl p-2.5 text-sm text-white"
                />
              </div>

              <div className="flex space-x-3 pt-3 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowAddTeamModal(false)}
                  className="flex-1 py-2 rounded-xl bg-white/[0.05] text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-brand-500 to-pulse-500 hover:brightness-110 text-white font-bold"
                >
                  Save Team
                </button>
              </div>
            </form>
          </div>
        </SheetBackdrop>
      )}

      {/* ADD PLAYER MODAL */}
      {showAddPlayerModal && (
        <SheetBackdrop>
          <div className="card sheet max-w-md px-6 pt-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-base font-black text-white">Add Player to Squad</h3>
              <button onClick={() => setShowAddPlayerModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePlayerSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-300 uppercase block mb-1">Player Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shubman Gill"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl p-2.5 text-sm text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 uppercase block mb-1">Playing Role</label>
                <select
                  value={newPlayerRole}
                  onChange={(e) => setNewPlayerRole(e.target.value as any)}
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl p-2 text-xs text-white"
                >
                  <option value="batter">Top-Order Batter</option>
                  <option value="bowler">Specialist Bowler</option>
                  <option value="all_rounder">All-Rounder</option>
                  <option value="wicket_keeper">Wicket-Keeper Batter</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-300 uppercase block mb-1">Batting Style</label>
                  <select
                    value={newPlayerBattingStyle}
                    onChange={(e) => setNewPlayerBattingStyle(e.target.value as any)}
                    className="w-full bg-white/[0.05] border border-white/10 rounded-xl p-2 text-xs text-white"
                  >
                    <option value="right_hand">Right-hand bat</option>
                    <option value="left_hand">Left-hand bat</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-300 uppercase block mb-1">Bowling Style</label>
                  <select
                    value={newPlayerBowlingStyle}
                    onChange={(e) => setNewPlayerBowlingStyle(e.target.value as any)}
                    className="w-full bg-white/[0.05] border border-white/10 rounded-xl p-2 text-xs text-white"
                  >
                    <option value="right_arm_fast">Right-arm Fast</option>
                    <option value="right_arm_medium">Right-arm Medium</option>
                    <option value="right_arm_spin">Right-arm Spin</option>
                    <option value="left_arm_fast">Left-arm Fast</option>
                    <option value="left_arm_spin">Left-arm Spin</option>
                    <option value="none">Does Not Bowl</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-3 pt-3 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowAddPlayerModal(false)}
                  className="flex-1 py-2 rounded-xl bg-white/[0.05] text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-brand-500 to-pulse-500 hover:brightness-110 text-white font-bold"
                >
                  Add to Squad
                </button>
              </div>
            </form>
          </div>
        </SheetBackdrop>
      )}
    </div>
  );
};
