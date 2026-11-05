import { SheetBackdrop } from './ui/SheetBackdrop';
import { AnimatePresence, motion } from 'motion/react';
import React, { useState } from 'react';
import {
  Dismissal,
  DismissalType,
  ExtraType,
  Match,
  Player,
} from '../types/cricket';
import { useCricket } from '../context/CricketContext';
import {
  RotateCcw,
  Edit3,
  UserCheck,
  AlertTriangle,
  Trophy,
  ArrowRightLeft,
  X,
  Check,
  Plus,
  Play,
} from 'lucide-react';

interface ScoringPadProps {
  match: Match;
}

export const ScoringPad: React.FC<ScoringPadProps> = ({ match }) => {
  const {
    recordDelivery,
    undoDelivery,
    editDelivery,
    startSecondInnings,
    reopenMatch,
    openAuthModal,
    canScoreMatch,
  } = useCricket();
  // Admins: any match. Scorers: only matches assigned to them.
  const canScore = canScoreMatch(match.id);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Wicket modal state
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [wicketType, setWicketType] = useState<DismissalType>('bowled');
  const [outPlayerId, setOutPlayerId] = useState<string>('');
  const [fielderId, setFielderId] = useState<string>('');
  const [newBatterId, setNewBatterId] = useState<string>('');
  const [runsOnWicket, setRunsOnWicket] = useState<number>(0);

  // Extras modal state
  const [showExtrasModal, setShowExtrasModal] = useState(false);
  const [selectedExtraType, setSelectedExtraType] = useState<ExtraType>('wide');
  const [extraBatRuns, setExtraBatRuns] = useState<number>(0);
  const [extraTotalRuns, setExtraTotalRuns] = useState<number>(1);

  // Historical ball edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBallId, setEditingBallId] = useState<string>('');
  const [editRunsBat, setEditRunsBat] = useState<number>(0);
  const [editRunsExtra, setEditRunsExtra] = useState<number>(0);
  const [editExtraType, setEditExtraType] = useState<ExtraType>('none');
  const [editIsWicket, setEditIsWicket] = useState<boolean>(false);

  // Bowler & Batter Switchers
  const [showPlayerSwitchModal, setShowPlayerSwitchModal] = useState<'striker' | 'bowler' | null>(null);

  const currentIdx = match.currentInningsIndex;
  const currentInn = match.innings[currentIdx];
  const battingTeam = currentIdx === 0 ? match.team1 : match.team2;
  const bowlingTeam = currentIdx === 0 ? match.team2 : match.team1;

  const currentStriker = currentInn.batters.find((b) => b.playerId === currentInn.currentStrikerId);
  const currentNonStriker = currentInn.batters.find((b) => b.playerId === currentInn.currentNonStrikerId);
  const currentBowler = currentInn.bowlers.find((b) => b.playerId === currentInn.currentBowlerId);

  // Available new batters (not yet batted)
  const battedPlayerIds = currentInn.batters.map((b) => b.playerId);
  const availableNewBatters = battingTeam.squad.filter((p) => !battedPlayerIds.includes(p.id));

  // Handle standard run entry (0, 1, 2, 3, 4, 6)
  const handleScoreRun = async (runs: number) => {
    if (isSubmitting || match.status === 'completed') return;
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await recordDelivery(match.id, {
        runsBat: runs,
        extraType: 'none',
        isWicket: false,
        isBoundaryFour: runs === 4,
        isBoundarySix: runs === 6,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Scoring error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open wicket modal
  const handleOpenWicket = () => {
    setOutPlayerId(currentInn.currentStrikerId);
    setWicketType('bowled');
    setFielderId('');
    setNewBatterId(availableNewBatters[0]?.id || '');
    setRunsOnWicket(0);
    setShowWicketModal(true);
  };

  // Submit wicket
  const handleSubmitWicket = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const outBatter = battingTeam.squad.find((p) => p.id === outPlayerId) || { name: 'Batter' };
      const fielder = bowlingTeam.squad.find((p) => p.id === fielderId);
      const newBatter = battingTeam.squad.find((p) => p.id === newBatterId);

      const dismissal: Dismissal = {
        type: wicketType,
        playerOutId: outPlayerId,
        playerOutName: outBatter.name,
        assistedById: fielder?.id,
        assistedByName: fielder?.name,
        newBatterId: newBatter?.id,
        newBatterName: newBatter?.name,
      };

      await recordDelivery(match.id, {
        runsBat: runsOnWicket,
        extraType: 'none',
        isWicket: true,
        dismissal,
      });

      setShowWicketModal(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error recording wicket');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Extras (Wide, No-Ball, Byes, Leg-Byes)
  const handleSubmitExtras = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const isWideOrNb = selectedExtraType === 'wide' || selectedExtraType === 'noBall';
      await recordDelivery(match.id, {
        runsBat: selectedExtraType === 'noBall' ? extraBatRuns : 0,
        runsExtra: extraTotalRuns,
        extraType: selectedExtraType,
        isWicket: false,
        isBoundaryFour: extraBatRuns === 4,
        isBoundarySix: extraBatRuns === 6,
      });

      setShowExtrasModal(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error recording extras');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Quick Undo
  const handleUndo = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await undoDelivery(match.id);
    } catch (err: any) {
      setErrorMessage(err.message || 'Undo error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Ball History Edit
  const handleOpenEditBall = (ball: any) => {
    setEditingBallId(ball.id);
    setEditRunsBat(ball.runsBat);
    setEditRunsExtra(ball.runsExtra);
    setEditExtraType(ball.extraType);
    setEditIsWicket(ball.isWicket);
    setShowEditModal(true);
  };

  const handleSaveBallEdit = async () => {
    if (!editingBallId) return;
    try {
      const isLegal = editExtraType !== 'wide' && editExtraType !== 'noBall';
      await editDelivery(match.id, editingBallId, {
        runsBat: editRunsBat,
        runsExtra: editRunsExtra,
        extraType: editExtraType,
        isLegal,
        isWicket: editIsWicket,
      });
      setShowEditModal(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to edit ball delivery');
    }
  };

  // If match completed, show complete banner and block scoring!
  if (match.status === 'completed') {
    return (
      <div className="card p-6 text-center space-y-4 shadow-xl">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center">
          <Trophy className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-2xl font-black text-white">MATCH COMPLETED</h3>
          <p className="text-emerald-400 font-extrabold text-lg mt-1">
            {match.result?.summaryText || 'Match has ended'}
          </p>
          <p className="text-slate-400 text-xs mt-2 max-w-md mx-auto">
            Normal ball-by-ball scoring is now automatically blocked. Points table, net run rate, and player MVP stats have been updated.
          </p>
        </div>

        {canScore && (
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <button
              onClick={handleUndo}
              className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-slate-200 font-semibold text-xs flex items-center space-x-1.5 transition-colors"
            >
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <span>Undo Last Ball</span>
            </button>
            <button
              onClick={() => reopenMatch(match.id)}
              className="px-4 py-2 rounded-xl bg-cyan-700 hover:bg-cyan-600 text-white font-semibold text-xs flex items-center space-x-1.5 transition-colors"
            >
              <Play className="w-4 h-4" />
              <span>Reopen Match for Corrections</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // If innings 1 completed, prompt for 2nd innings
  if (currentInn.isCompleted && currentIdx === 0) {
    return (
      <div className="card p-6 text-center space-y-4 shadow-xl">
        <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 mx-auto flex items-center justify-center">
          <ArrowRightLeft className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-2xl font-black text-white">1ST INNINGS COMPLETED</h3>
          <p className="text-cyan-400 font-extrabold text-lg mt-1">
            {battingTeam.name} scored {currentInn.totalRuns}/{currentInn.wickets} ({currentInn.oversFormatted} ov)
          </p>
          <p className="text-slate-200 font-semibold text-sm mt-2">
            Target for {bowlingTeam.name}:{' '}
            <span className="text-cyan-300 font-extrabold text-base">{currentInn.totalRuns + 1}</span> runs
          </p>
        </div>

        {canScore ? (
          <button
            onClick={() => startSecondInnings(match.id)}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-pulse-500 hover:brightness-110 text-white font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all active:scale-95 mx-auto flex items-center space-x-2"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Start 2nd Innings ({bowlingTeam.name} Chase)</span>
          </button>
        ) : (
          <p className="text-xs text-slate-400">Waiting for scorer to start 2nd innings...</p>
        )}
      </div>
    );
  }

  return (
    <div className="card p-4 sm:p-6 space-y-5">
      {/* Read-only notice */}
      {!canScore && (
        <div className="p-3 bg-brand-500/10 border border-brand-500/25 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs text-brand-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>
              You are viewing in <strong>read-only mode</strong>. Only the assigned scorer or an admin can score this match.
            </span>
          </div>
          <button onClick={() => openAuthModal()} className="btn-primary !min-h-9 !py-1.5 !px-3 text-xs">
            Request access
          </button>
        </div>
      )}

      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-3 bg-live-600/15 border border-live-500/30 rounded-xl text-xs text-live-400 flex items-center justify-between"
          >
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage('')} className="p-1 hover:text-white" aria-label="Dismiss">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Scorer Controls */}
      <div className="space-y-3">
        {/* Runs keypad: 3 columns on phones for big thumb targets */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
          {[
            { runs: 0, sub: 'Dot', className: 'bg-white/[0.04] border-white/10 text-slate-200' },
            { runs: 1, sub: 'Single', className: 'bg-white/[0.04] border-white/10 text-white' },
            { runs: 2, sub: 'Double', className: 'bg-white/[0.04] border-white/10 text-white' },
            { runs: 3, sub: 'Triple', className: 'bg-white/[0.04] border-white/10 text-white' },
            {
              runs: 4,
              sub: 'Four',
              className: 'bg-gradient-to-br from-brand-500/40 to-brand-600/20 border-brand-400/50 text-brand-300 shadow-lg shadow-brand-500/10',
            },
            {
              runs: 6,
              sub: 'Six',
              className: 'bg-gradient-to-br from-pulse-500/45 to-pulse-600/20 border-pulse-400/50 text-pulse-400 shadow-lg shadow-pulse-500/10',
            },
          ].map((item) => (
            <motion.button
              key={item.runs}
              whileTap={{ scale: 0.92 }}
              disabled={isSubmitting || !canScore}
              onClick={() => handleScoreRun(item.runs)}
              className={`min-h-20 rounded-2xl border flex flex-col items-center justify-center transition-colors hover:brightness-125 disabled:opacity-40 disabled:cursor-not-allowed ${item.className}`}
            >
              <span className="font-display text-5xl font-semibold leading-none">{item.runs}</span>
              <span className="text-[10px] uppercase tracking-wider font-semibold opacity-70">{item.sub}</span>
            </motion.button>
          ))}
        </div>

        {/* Wicket + extras */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
          <motion.button
            whileTap={{ scale: 0.95 }}
            disabled={isSubmitting || !canScore}
            onClick={handleOpenWicket}
            className="col-span-3 sm:col-span-1 min-h-14 rounded-2xl bg-gradient-to-r from-live-600 to-live-500 text-white font-display text-3xl font-semibold tracking-wide shadow-lg shadow-live-600/30 border border-live-400/40 flex items-center justify-center hover:brightness-110 disabled:opacity-40"
          >
            Wicket
          </motion.button>

          {[
            { type: 'wide' as const, label: 'Wide', sub: 'WD', className: 'bg-trophy-500/10 border-trophy-500/30 text-trophy-300' },
            { type: 'noBall' as const, label: 'No-ball', sub: 'NB', className: 'bg-trophy-500/10 border-trophy-500/30 text-trophy-300' },
            { type: 'bye' as const, label: 'Byes', sub: 'B / LB', className: 'bg-white/[0.04] border-white/10 text-slate-300' },
          ].map((extra) => (
            <motion.button
              key={extra.type}
              whileTap={{ scale: 0.94 }}
              disabled={isSubmitting || !canScore}
              onClick={() => {
                setSelectedExtraType(extra.type);
                setExtraBatRuns(0);
                setExtraTotalRuns(1);
                setShowExtrasModal(true);
              }}
              className={`min-h-14 rounded-2xl border flex flex-col items-center justify-center hover:brightness-125 disabled:opacity-40 ${extra.className}`}
            >
              <span className="text-sm font-bold">{extra.label}</span>
              <span className="text-[10px] font-semibold opacity-60">{extra.sub}</span>
            </motion.button>
          ))}
        </div>

        {/* Scorer utilities */}
        {canScore && (
          <div className="pt-3 border-t border-white/[0.06] grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <button
              disabled={isSubmitting || currentInn.deliveries.length === 0}
              onClick={handleUndo}
              className="btn-ghost !min-h-11 text-xs text-trophy-300 disabled:opacity-40"
              title="Undo the previous delivery"
            >
              <RotateCcw className="w-4 h-4" /> Undo ball
            </button>
            <button
              onClick={() => {
                if (currentInn.deliveries.length > 0) {
                  handleOpenEditBall(currentInn.deliveries[currentInn.deliveries.length - 1]);
                } else {
                  alert('No deliveries recorded yet to edit.');
                }
              }}
              className="btn-ghost !min-h-11 text-xs"
              title="Edit recorded delivery details"
            >
              <Edit3 className="w-4 h-4 text-brand-400" /> Edit balls
            </button>
            <button onClick={() => setShowPlayerSwitchModal('striker')} className="btn-ghost !min-h-11 text-xs">
              <ArrowRightLeft className="w-4 h-4 text-brand-400" /> Switch striker
            </button>
            <button onClick={() => setShowPlayerSwitchModal('bowler')} className="btn-ghost !min-h-11 text-xs">
              <UserCheck className="w-4 h-4 text-trophy-400" /> Bowler
            </button>
          </div>
        )}
      </div>

      {/* WICKET MODAL */}
      {showWicketModal && (
        <SheetBackdrop>
          <div className="card sheet max-w-md px-6 pt-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-lg font-black text-rose-400 flex items-center space-x-2">
                <span>Record Wicket / Dismissal</span>
              </h3>
              <button
                onClick={() => setShowWicketModal(false)}
                className="p-1 rounded hover:bg-white/[0.05] text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dismissal Type */}
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase block mb-1.5">
                Dismissal Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'bowled', label: 'Bowled' },
                  { id: 'caught', label: 'Caught' },
                  { id: 'caught_behind', label: 'Caught Behind' },
                  { id: 'lbw', label: 'LBW' },
                  { id: 'run_out', label: 'Run Out' },
                  { id: 'stumped', label: 'Stumped' },
                  { id: 'hit_wicket', label: 'Hit Wicket' },
                  { id: 'retired', label: 'Retired Out' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setWicketType(item.id as DismissalType)}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold border transition-all ${
                      wicketType === item.id
                        ? 'bg-rose-600 text-white border-rose-500'
                        : 'bg-white/[0.05] text-slate-300 border-white/10 hover:bg-white/[0.08]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Who is Out? */}
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase block mb-1.5">
                Player Out
              </label>
              <select
                value={outPlayerId}
                onChange={(e) => setOutPlayerId(e.target.value)}
                className="w-full bg-white/[0.05] border border-white/10 rounded-lg p-2.5 text-sm text-white"
              >
                {currentStriker && (
                  <option value={currentStriker.playerId}>
                    Striker: {currentStriker.name} ({currentStriker.runs} runs)
                  </option>
                )}
                {currentNonStriker && (
                  <option value={currentNonStriker.playerId}>
                    Non-Striker: {currentNonStriker.name} ({currentNonStriker.runs} runs)
                  </option>
                )}
              </select>
            </div>

            {/* Fielder for Catch / Runout / Stumping */}
            {(wicketType === 'caught' ||
              wicketType === 'caught_behind' ||
              wicketType === 'run_out' ||
              wicketType === 'stumped') && (
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase block mb-1.5">
                  Fielder (for MVP & Stats Credit)
                </label>
                <select
                  value={fielderId}
                  onChange={(e) => setFielderId(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/10 rounded-lg p-2.5 text-sm text-white"
                >
                  <option value="">-- Select Fielder --</option>
                  {bowlingTeam.squad.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.role.replace('_', ' ')})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* New Batter Coming In */}
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase block mb-1.5">
                New Batter
              </label>
              {availableNewBatters.length > 0 ? (
                <select
                  value={newBatterId}
                  onChange={(e) => setNewBatterId(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/10 rounded-lg p-2.5 text-sm text-white"
                >
                  {availableNewBatters.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.role.replace('_', ' ')})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-xs text-amber-400 italic p-2 bg-amber-950/40 rounded border border-amber-800/50">
                  Last wicket! No more batters available in squad.
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-3 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => setShowWicketModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/10 text-slate-300 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitWicket}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold shadow-lg shadow-rose-900/40"
              >
                Confirm Wicket
              </button>
            </div>
          </div>
        </SheetBackdrop>
      )}

      {/* EXTRAS MODAL */}
      {showExtrasModal && (
        <SheetBackdrop>
          <div className="card sheet max-w-md px-6 pt-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-lg font-black text-amber-400">Record Extra Delivery</h3>
              <button
                onClick={() => setShowExtrasModal(false)}
                className="p-1 rounded hover:bg-white/[0.05] text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Select Extra Type */}
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase block mb-1.5">
                Extra Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'wide', label: 'Wide (WD)' },
                  { id: 'noBall', label: 'No-Ball (NB)' },
                  { id: 'bye', label: 'Bye (B)' },
                  { id: 'legBye', label: 'Leg-Bye (LB)' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedExtraType(item.id as ExtraType);
                      setExtraTotalRuns(1);
                      setExtraBatRuns(0);
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border ${
                      selectedExtraType === item.id
                        ? 'bg-amber-600 text-white border-amber-500'
                        : 'bg-white/[0.05] text-slate-300 border-white/10'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Extra Runs Configuration */}
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase block mb-1.5">
                {selectedExtraType === 'wide'
                  ? 'Total Runs off Wide (1 standard + any overthrows/running)'
                  : selectedExtraType === 'noBall'
                  ? 'Runs off Bat (Free hit applies next ball)'
                  : 'Runs from Bye / Leg-Bye'}
              </label>
              <div className="flex space-x-2">
                {[0, 1, 2, 3, 4, 6].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      if (selectedExtraType === 'noBall') {
                        setExtraBatRuns(r);
                        setExtraTotalRuns(1);
                      } else if (selectedExtraType === 'wide') {
                        setExtraTotalRuns(1 + r);
                      } else {
                        setExtraTotalRuns(r || 1);
                      }
                    }}
                    className={`flex-1 py-2 rounded-lg font-mono font-bold text-sm border ${
                      (selectedExtraType === 'noBall' && extraBatRuns === r) ||
                      (selectedExtraType === 'wide' && extraTotalRuns === 1 + r) ||
                      (selectedExtraType !== 'wide' && selectedExtraType !== 'noBall' && extraTotalRuns === r)
                        ? 'bg-cyan-600 text-white border-cyan-500'
                        : 'bg-white/[0.05] text-slate-300 border-white/10'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary Preview */}
            <div className="p-3 bg-ink-950/70 border border-white/[0.06] rounded-xl text-xs text-slate-300">
              Score impact:{' '}
              <strong className="text-white">
                +{selectedExtraType === 'noBall' ? 1 + extraBatRuns : extraTotalRuns} runs
              </strong>{' '}
              ({selectedExtraType.toUpperCase()})
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-3 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => setShowExtrasModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/10 text-slate-300 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitExtras}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold shadow-lg shadow-amber-900/40"
              >
                Record Extra
              </button>
            </div>
          </div>
        </SheetBackdrop>
      )}

      {/* EDIT BALL HISTORY MODAL */}
      {showEditModal && (
        <SheetBackdrop>
          <div className="card sheet max-w-lg px-6 pt-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-lg font-black text-cyan-400">Edit Ball Delivery History</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded hover:bg-white/[0.05] text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Select any past delivery in this innings to correct runs, extras, or dismissal status. All overs, targets, and stats recalculate automatically.
            </p>

            {/* Ball selector from deliveries */}
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase block mb-1.5">
                Select Delivery
              </label>
              <div className="max-h-36 overflow-y-auto space-y-1.5 border border-white/[0.06] rounded-xl p-2 bg-ink-950/60">
                {currentInn.deliveries.map((del, idx) => (
                  <button
                    key={del.id}
                    type="button"
                    onClick={() => {
                      setEditingBallId(del.id);
                      setEditRunsBat(del.runsBat);
                      setEditRunsExtra(del.runsExtra);
                      setEditExtraType(del.extraType);
                      setEditIsWicket(del.isWicket);
                    }}
                    className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between ${
                      editingBallId === del.id
                        ? 'bg-cyan-950 border border-cyan-600 text-cyan-200'
                        : 'text-slate-300 hover:bg-ink-850'
                    }`}
                  >
                    <span>
                      Ball #{idx + 1} ({del.bowlerName} to {del.strikerName})
                    </span>
                    <span className="font-bold">
                      {del.isWicket ? 'Wicket' : `${del.runsBat + del.runsExtra} runs`}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Runs Bat */}
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase block mb-1">
                Runs off Bat
              </label>
              <div className="flex space-x-2">
                {[0, 1, 2, 3, 4, 6].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setEditRunsBat(r)}
                    className={`flex-1 py-1.5 rounded-lg font-mono font-bold text-xs border ${
                      editRunsBat === r
                        ? 'bg-cyan-600 text-white border-cyan-500'
                        : 'bg-white/[0.05] text-slate-300 border-white/10'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Extra type */}
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase block mb-1">
                Extra Type
              </label>
              <select
                value={editExtraType}
                onChange={(e) => setEditExtraType(e.target.value as ExtraType)}
                className="w-full bg-white/[0.05] border border-white/10 rounded-lg p-2 text-xs text-white"
              >
                <option value="none">None (Legal Delivery)</option>
                <option value="wide">Wide (WD)</option>
                <option value="noBall">No-Ball (NB)</option>
                <option value="bye">Bye (B)</option>
                <option value="legBye">Leg-Bye (LB)</option>
              </select>
            </div>

            <div className="flex space-x-3 pt-3 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/10 text-slate-300 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveBallEdit}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-pulse-500 hover:brightness-110 text-white text-sm font-bold shadow-lg shadow-cyan-900/40"
              >
                Save & Recalculate
              </button>
            </div>
          </div>
        </SheetBackdrop>
      )}

      {/* Switch Striker or Bowler Modal */}
      {showPlayerSwitchModal && (
        <SheetBackdrop>
          <div className="card sheet max-w-sm px-5 pt-5 space-y-4">
            <h3 className="text-base font-black text-white">
              {showPlayerSwitchModal === 'striker' ? 'Select Striker' : 'Select Current Bowler'}
            </h3>

            <div className="space-y-2">
              {showPlayerSwitchModal === 'striker' ? (
                <>
                  <button
                    onClick={() => {
                      currentInn.currentStrikerId = currentInn.batters[0]?.playerId;
                      setShowPlayerSwitchModal(null);
                    }}
                    className="w-full text-left p-3 rounded-xl bg-white/[0.05] hover:bg-white/10 text-white text-xs font-semibold"
                  >
                    Striker: {currentStriker?.name}
                  </button>
                  <button
                    onClick={() => {
                      const temp = currentInn.currentStrikerId;
                      currentInn.currentStrikerId = currentInn.currentNonStrikerId;
                      currentInn.currentNonStrikerId = temp;
                      setShowPlayerSwitchModal(null);
                    }}
                    className="w-full text-left p-3 rounded-xl bg-white/[0.05] hover:bg-white/10 text-cyan-300 text-xs font-semibold"
                  >
                    Swap with Non-Striker ({currentNonStriker?.name})
                  </button>
                </>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {bowlingTeam.squad.map((bowler) => (
                    <button
                      key={bowler.id}
                      onClick={async () => {
                        currentInn.currentBowlerId = bowler.id;
                        setShowPlayerSwitchModal(null);
                      }}
                      className={`w-full text-left p-2.5 rounded-lg text-xs font-medium flex items-center justify-between ${
                        currentInn.currentBowlerId === bowler.id
                          ? 'bg-amber-600/30 border border-amber-500 text-amber-200'
                          : 'bg-white/[0.05] text-slate-200 hover:bg-white/10'
                      }`}
                    >
                      <span>{bowler.name}</span>
                      <span className="text-[11px] text-slate-400 capitalize">
                        {bowler.bowlingStyle.replace(/_/g, ' ')}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowPlayerSwitchModal(null)}
              className="w-full py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-slate-300 text-xs font-semibold"
            >
              Close
            </button>
          </div>
        </SheetBackdrop>
      )}
    </div>
  );
};
