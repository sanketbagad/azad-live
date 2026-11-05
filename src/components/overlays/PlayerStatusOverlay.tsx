import React from 'react';
import { Match, Player } from '../../types/cricket';
import { Users, Shield, Target } from 'lucide-react';

interface PlayerStatusOverlayProps {
  match: Match;
  isStandalone?: boolean;
}

export const PlayerStatusOverlay: React.FC<PlayerStatusOverlayProps> = ({ match }) => {
  const inn0 = match.innings[0];
  const inn1 = match.innings[1];
  const activeIdx = match.currentInningsIndex;
  const activeInn = match.innings[activeIdx];

  // Helper to determine real match status for a player
  const getPlayerStatus = (player: Player, teamIndex: 0 | 1) => {
    const isBattingTeam = (activeIdx === 0 && teamIndex === 0) || (activeIdx === 1 && teamIndex === 1);
    const inn = teamIndex === 0 ? inn0 : inn1;
    const oppInn = teamIndex === 0 ? inn1 : inn0;

    // Check batting status
    const batterStats = inn.batters.find((b) => b.playerId === player.id);
    const isStriker = activeInn.currentStrikerId === player.id;
    const isNonStriker = activeInn.currentNonStrikerId === player.id;

    // Check bowling status
    const bowlerStats = oppInn.bowlers.find((bw) => bw.playerId === player.id);
    const isCurrentBowler = activeInn.currentBowlerId === player.id;

    let badge = 'bg-slate-800 text-slate-300';
    let statusText = 'Yet to bat';
    let detailText: string = player.role || 'Player';

    if (isStriker) {
      badge = 'bg-cyan-500 text-black font-black animate-pulse';
      statusText = `* Striker: ${batterStats?.runs || 0}* (${batterStats?.balls || 0}b)`;
      detailText = `SR ${(batterStats?.strikeRate || 0).toFixed(0)} • ${batterStats?.fours || 0}×4 ${batterStats?.sixes || 0}×6`;
    } else if (isNonStriker) {
      badge = 'bg-cyan-900 text-cyan-200 font-bold border border-cyan-600';
      statusText = `Non-Striker: ${batterStats?.runs || 0}* (${batterStats?.balls || 0}b)`;
      detailText = `SR ${(batterStats?.strikeRate || 0).toFixed(0)}`;
    } else if (batterStats?.isOut) {
      badge = 'bg-rose-950 text-rose-300 border border-rose-800';
      statusText = `Out: ${batterStats.runs} (${batterStats.balls}b)`;
      detailText = batterStats.dismissalText || 'Dismissed';
    } else if (batterStats && !batterStats.isOut) {
      badge = 'bg-emerald-950 text-emerald-300 border border-emerald-800';
      statusText = `Not Out: ${batterStats.runs}* (${batterStats.balls}b)`;
      detailText = `SR ${batterStats.strikeRate.toFixed(0)}`;
    }

    if (isCurrentBowler) {
      badge = 'bg-amber-500 text-black font-black';
      statusText = `* Bowling: ${bowlerStats?.wickets || 0}-${bowlerStats?.runsConceded || 0}`;
      detailText = `${bowlerStats?.overs || '0.0'} ov • Econ ${(bowlerStats?.economy || 0).toFixed(1)}`;
    } else if (bowlerStats && (!isBattingTeam || oppInn.legalDeliveries > 0)) {
      if (statusText === 'Yet to bat') {
        badge = 'bg-purple-950 text-purple-300 border border-purple-800';
        statusText = `Bowled: ${bowlerStats.wickets}-${bowlerStats.runsConceded}`;
        detailText = `${bowlerStats.overs} ov • Econ ${bowlerStats.economy.toFixed(1)}`;
      }
    }

    return { badge, statusText, detailText, isCurrent: isStriker || isNonStriker || isCurrentBowler };
  };

  return (
    <div
      className="w-full max-w-6xl mx-auto font-sans select-none text-white my-auto"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <div className="bg-slate-950/95 border-2 border-amber-500/90 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.95)] backdrop-blur-md overflow-hidden">
        {/* Broadcast Header */}
        <div className="bg-gradient-to-r from-red-950/80 via-slate-950 to-slate-950 px-6 py-4 border-b border-amber-900/40 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded bg-gradient-to-r from-red-600 to-rose-700 text-white font-black text-[10px] tracking-widest border border-red-500/80 shadow-sm shadow-red-500/40">
                  AZAD LIVE
                </span>
                <span className="font-black text-lg text-white uppercase tracking-tight">
                  {match.tournamentName || 'TOURNAMENT'} • SQUADS & STATUS
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-amber-950 text-amber-300 font-bold border border-amber-800">
                  {match.name}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Live Playing XI Squad Status, Active Batters & Bowlers
              </p>
            </div>
          </div>

          <div className="text-right font-mono">
            <div className="text-xl font-black text-cyan-400">
              {activeInn.totalRuns}/{activeInn.wickets}
              <span className="text-xs text-slate-400 ml-1.5 font-normal">({activeInn.oversFormatted} ov)</span>
            </div>
            <div className="text-[11px] text-slate-400 font-sans">
              {activeIdx === 0 ? match.team1.shortName : match.team2.shortName} Batting
            </div>
          </div>
        </div>

        {/* Two Columns for Team 1 and Team 2 */}
        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* TEAM 1 SQUAD */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div
                  className="w-3 h-6 rounded-full"
                  style={{ backgroundColor: match.team1.color || '#3B82F6' }}
                />
                <h3 className="font-black text-sm text-white uppercase tracking-tight">
                  {match.team1.name} ({match.team1.shortName})
                </h3>
              </div>
              <span className="text-[11px] font-mono text-cyan-400">
                {inn0.totalRuns}/{inn0.wickets} ({inn0.oversFormatted} ov)
              </span>
            </div>

            <div className="mt-3 space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {match.team1.squad.length === 0 ? (
                <div className="text-slate-500 text-center py-4 text-xs italic">No squad registered</div>
              ) : (
                match.team1.squad.map((player) => {
                  const status = getPlayerStatus(player, 0);
                  return (
                    <div
                      key={player.id}
                      className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                        status.isCurrent
                          ? 'bg-cyan-950/50 border-cyan-500/70 shadow-sm'
                          : 'bg-slate-950/70 border-slate-800/80'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-xs text-white truncate">{player.name}</span>
                          <span className="text-[10px] text-slate-400 capitalize">({player.role})</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block truncate">{status.detailText}</span>
                      </div>

                      <div className="shrink-0 text-right">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${status.badge}`}>
                          {status.statusText}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* TEAM 2 SQUAD */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div
                  className="w-3 h-6 rounded-full"
                  style={{ backgroundColor: match.team2.color || '#F59E0B' }}
                />
                <h3 className="font-black text-sm text-white uppercase tracking-tight">
                  {match.team2.name} ({match.team2.shortName})
                </h3>
              </div>
              <span className="text-[11px] font-mono text-cyan-400">
                {inn1.totalRuns}/{inn1.wickets} ({inn1.oversFormatted} ov)
              </span>
            </div>

            <div className="mt-3 space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {match.team2.squad.length === 0 ? (
                <div className="text-slate-500 text-center py-4 text-xs italic">No squad registered</div>
              ) : (
                match.team2.squad.map((player) => {
                  const status = getPlayerStatus(player, 1);
                  return (
                    <div
                      key={player.id}
                      className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                        status.isCurrent
                          ? 'bg-cyan-950/50 border-cyan-500/70 shadow-sm'
                          : 'bg-slate-950/70 border-slate-800/80'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-xs text-white truncate">{player.name}</span>
                          <span className="text-[10px] text-slate-400 capitalize">({player.role})</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block truncate">{status.detailText}</span>
                      </div>

                      <div className="shrink-0 text-right">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${status.badge}`}>
                          {status.statusText}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-950 px-6 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span>Asterisk (*) indicates active striker / current bowler</span>
          </div>
          <div className="font-mono text-cyan-400 font-semibold">
            PRISM Live Broadcast
          </div>
        </div>
      </div>
    </div>
  );
};
