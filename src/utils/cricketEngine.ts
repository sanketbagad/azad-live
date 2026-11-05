import {
  BallDelivery,
  BatterInningsStats,
  BowlerInningsStats,
  Dismissal,
  ExtraType,
  Innings,
  Match,
  MatchResult,
  Player,
  PlayerOfTheMatch,
  PointsTableEntry,
  Team,
  Tournament,
} from '../types/cricket.js';

/**
 * Format legal delivery count into cricket overs string (e.g. 23 balls -> "3.5", 24 balls -> "4.0")
 */
export function formatOvers(legalDeliveries: number): string {
  const completeOvers = Math.floor(legalDeliveries / 6);
  const remainingBalls = legalDeliveries % 6;
  return `${completeOvers}.${remainingBalls}`;
}

/**
 * Convert overs string or legal balls into decimal overs for NRR (e.g. 3.3 -> 3.5)
 */
export function oversToDecimal(legalDeliveries: number): number {
  const complete = Math.floor(legalDeliveries / 6);
  const balls = legalDeliveries % 6;
  return complete + balls / 6;
}

/**
 * Calculate Run Rate
 */
export function calculateRunRate(runs: number, legalDeliveries: number): number {
  if (legalDeliveries === 0) return 0;
  const overs = oversToDecimal(legalDeliveries);
  if (overs === 0) return 0;
  return Number((runs / overs).toFixed(2));
}

/**
 * Calculate Required Run Rate
 */
export function calculateRequiredRunRate(runsNeeded: number, ballsRemaining: number): number | null {
  if (ballsRemaining <= 0) {
    return runsNeeded <= 0 ? 0 : 99.99;
  }
  const oversRemaining = ballsRemaining / 6;
  return Number((runsNeeded / oversRemaining).toFixed(2));
}

/**
 * Create a pristine empty innings
 */
export function createEmptyInnings(
  battingTeam: Team,
  bowlingTeam: Team,
  maxOvers: number,
  maxWickets: number = 10
): Innings {
  const squad = battingTeam.squad || [];
  const striker = squad[0] || { id: 'bat1', name: 'Striker' };
  const nonStriker = squad[1] || { id: 'bat2', name: 'Non-Striker' };

  const initialBatters: BatterInningsStats[] = [
    {
      playerId: striker.id,
      name: striker.name,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      dots: 0,
      strikeRate: 0,
      isOut: false,
      dismissalText: 'not out',
      battingOrder: 1,
    },
    {
      playerId: nonStriker.id,
      name: nonStriker.name,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      dots: 0,
      strikeRate: 0,
      isOut: false,
      dismissalText: 'not out',
      battingOrder: 2,
    },
  ];

  const bowlingSquad = bowlingTeam.squad || [];
  const openingBowler = bowlingSquad[bowlingSquad.length - 1] || { id: 'bowl1', name: 'Opening Bowler' };

  const initialBowlers: BowlerInningsStats[] = [
    {
      playerId: openingBowler.id,
      name: openingBowler.name,
      ballsBowled: 0,
      overs: '0.0',
      maidens: 0,
      runsConceded: 0,
      wickets: 0,
      economy: 0,
      dots: 0,
      wides: 0,
      noBalls: 0,
    },
  ];

  return {
    battingTeamId: battingTeam.id,
    battingTeamName: battingTeam.name,
    bowlingTeamId: bowlingTeam.id,
    bowlingTeamName: bowlingTeam.name,
    totalRuns: 0,
    wickets: 0,
    legalDeliveries: 0,
    oversFormatted: '0.0',
    maxOvers,
    maxWickets,
    extras: {
      wides: 0,
      noBalls: 0,
      byes: 0,
      legByes: 0,
      penalty: 0,
      total: 0,
    },
    deliveries: [],
    batters: initialBatters,
    bowlers: initialBowlers,
    currentStrikerId: striker.id,
    currentNonStrikerId: nonStriker.id,
    currentBowlerId: openingBowler.id,
    fallOfWickets: [],
    isCompleted: false,
  };
}

/**
 * Recomputes an entire innings deterministically from its deliveries list.
 * This ensures absolute integrity for Undo, Edit Ball, and Target checks.
 */
export function recalculateInnings(
  baseInnings: Innings,
  deliveries: BallDelivery[],
  battingSquad: Player[],
  bowlingSquad: Player[]
): Innings {
  const innings: Innings = {
    ...baseInnings,
    totalRuns: 0,
    wickets: 0,
    legalDeliveries: 0,
    oversFormatted: '0.0',
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0, total: 0 },
    deliveries: [],
    batters: [],
    bowlers: [],
    fallOfWickets: [],
    isCompleted: false,
    completionReason: undefined,
  };

  // Helper map for player names
  const playerNameMap = new Map<string, string>();
  battingSquad.forEach((p) => playerNameMap.set(p.id, p.name));
  bowlingSquad.forEach((p) => playerNameMap.set(p.id, p.name));

  // Initialize opening batters
  let strikerId = baseInnings.batters[0]?.playerId || battingSquad[0]?.id || 'bat1';
  let nonStrikerId = baseInnings.batters[1]?.playerId || battingSquad[1]?.id || 'bat2';
  let currentBowlerId = baseInnings.bowlers[0]?.playerId || bowlingSquad[0]?.id || 'bowl1';

  const battersMap = new Map<string, BatterInningsStats>();
  const bowlersMap = new Map<string, BowlerInningsStats>();

  function getOrCreateBatter(pId: string): BatterInningsStats {
    if (!battersMap.has(pId)) {
      const name = playerNameMap.get(pId) || pId;
      const b: BatterInningsStats = {
        playerId: pId,
        name,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        dots: 0,
        strikeRate: 0,
        isOut: false,
        dismissalText: 'not out',
        battingOrder: battersMap.size + 1,
      };
      battersMap.set(pId, b);
    }
    return battersMap.get(pId)!;
  }

  function getOrCreateBowler(pId: string): BowlerInningsStats {
    if (!bowlersMap.has(pId)) {
      const name = playerNameMap.get(pId) || pId;
      const b: BowlerInningsStats = {
        playerId: pId,
        name,
        ballsBowled: 0,
        overs: '0.0',
        maidens: 0,
        runsConceded: 0,
        wickets: 0,
        economy: 0,
        dots: 0,
        wides: 0,
        noBalls: 0,
      };
      bowlersMap.set(pId, b);
    }
    return bowlersMap.get(pId)!;
  }

  getOrCreateBatter(strikerId);
  getOrCreateBatter(nonStrikerId);
  getOrCreateBowler(currentBowlerId);

  // Track over runs for maiden over calculations
  let overDeliveriesCount = 0;
  let overRunsConceded = 0;

  for (let i = 0; i < deliveries.length; i++) {
    const ball = deliveries[i];
    innings.deliveries.push(ball);

    currentBowlerId = ball.bowlerId;
    const bowler = getOrCreateBowler(ball.bowlerId);
    const striker = getOrCreateBatter(ball.strikerId);
    getOrCreateBatter(ball.nonStrikerId);

    // Total runs
    const ballTotalRuns = ball.runsBat + ball.runsExtra;
    innings.totalRuns += ballTotalRuns;

    // Extras
    if (ball.extraType === 'wide') {
      innings.extras.wides += ball.runsExtra;
      bowler.wides += ball.runsExtra;
      bowler.runsConceded += ballTotalRuns;
      overRunsConceded += ballTotalRuns;
    } else if (ball.extraType === 'noBall') {
      innings.extras.noBalls += ball.runsExtra;
      bowler.noBalls += 1;
      bowler.runsConceded += ballTotalRuns;
      overRunsConceded += ballTotalRuns;
      striker.runs += ball.runsBat;
      if (ball.isBoundaryFour) striker.fours += 1;
      if (ball.isBoundarySix) striker.sixes += 1;
    } else if (ball.extraType === 'bye') {
      innings.extras.byes += ball.runsExtra;
      // Byes not charged to bowler
      if (ball.isLegal) {
        striker.balls += 1;
        if (ballTotalRuns === 0) striker.dots += 1;
      }
    } else if (ball.extraType === 'legBye') {
      innings.extras.legByes += ball.runsExtra;
      // Leg byes not charged to bowler
      if (ball.isLegal) {
        striker.balls += 1;
        if (ballTotalRuns === 0) striker.dots += 1;
      }
    } else if (ball.extraType === 'penalty') {
      innings.extras.penalty += ball.runsExtra;
    } else {
      // Normal delivery off the bat
      striker.runs += ball.runsBat;
      striker.balls += 1;
      bowler.runsConceded += ball.runsBat;
      overRunsConceded += ball.runsBat;

      if (ball.runsBat === 0) {
        striker.dots += 1;
        bowler.dots += 1;
      } else if (ball.isBoundaryFour) {
        striker.fours += 1;
      } else if (ball.isBoundarySix) {
        striker.sixes += 1;
      }
    }

    innings.extras.total =
      innings.extras.wides +
      innings.extras.noBalls +
      innings.extras.byes +
      innings.extras.legByes +
      innings.extras.penalty;

    // Strike rate
    if (striker.balls > 0) {
      striker.strikeRate = Number(((striker.runs / striker.balls) * 100).toFixed(1));
    }

    // Wicket handling
    if (ball.isWicket && ball.dismissal) {
      innings.wickets += 1;
      const outBatter = getOrCreateBatter(ball.dismissal.playerOutId);
      outBatter.isOut = true;

      const dType = ball.dismissal.type;
      const bName = bowler.name;
      const fName = ball.dismissal.assistedByName;

      if (dType === 'bowled') {
        outBatter.dismissalText = `b ${bName}`;
        bowler.wickets += 1;
      } else if (dType === 'caught') {
        outBatter.dismissalText = fName ? `c ${fName} b ${bName}` : `c & b ${bName}`;
        bowler.wickets += 1;
      } else if (dType === 'caught_behind') {
        outBatter.dismissalText = `c †${fName || 'Wk'} b ${bName}`;
        bowler.wickets += 1;
      } else if (dType === 'lbw') {
        outBatter.dismissalText = `lbw b ${bName}`;
        bowler.wickets += 1;
      } else if (dType === 'stumped') {
        outBatter.dismissalText = `st †${fName || 'Wk'} b ${bName}`;
        bowler.wickets += 1;
      } else if (dType === 'run_out') {
        outBatter.dismissalText = fName ? `run out (${fName})` : 'run out';
        // Run out not credited to bowler's wickets
      } else if (dType === 'hit_wicket') {
        outBatter.dismissalText = `hit wicket b ${bName}`;
        bowler.wickets += 1;
      } else if (dType === 'retired') {
        outBatter.dismissalText = 'retired out';
      } else {
        outBatter.dismissalText = dType;
      }

      innings.fallOfWickets.push({
        wicketNumber: innings.wickets,
        score: innings.totalRuns,
        over: formatOvers(innings.legalDeliveries + (ball.isLegal ? 1 : 0)),
        playerOutName: outBatter.name,
      });

      // Handle next batter
      if (ball.dismissal.newBatterId) {
        const newBatter = getOrCreateBatter(ball.dismissal.newBatterId);
        if (ball.dismissal.playerOutId === strikerId) {
          strikerId = newBatter.playerId;
        } else {
          nonStrikerId = newBatter.playerId;
        }
      }
    }

    // Legal delivery
    if (ball.isLegal) {
      innings.legalDeliveries += 1;
      bowler.ballsBowled += 1;
      overDeliveriesCount += 1;

      // Over completed?
      if (innings.legalDeliveries % 6 === 0) {
        if (overRunsConceded === 0 && overDeliveriesCount >= 6) {
          bowler.maidens += 1;
        }
        overRunsConceded = 0;
        overDeliveriesCount = 0;

        // Rotate strike at end of over
        const temp = strikerId;
        strikerId = nonStrikerId;
        nonStrikerId = temp;
      } else {
        // Rotate strike on odd runs if ball wasn't end of over
        if (ball.strikeRotated) {
          const temp = strikerId;
          strikerId = nonStrikerId;
          nonStrikerId = temp;
        }
      }
    } else {
      // Non-legal delivery: if strike rotated by running
      if (ball.strikeRotated) {
        const temp = strikerId;
        strikerId = nonStrikerId;
        nonStrikerId = temp;
      }
    }

    bowler.overs = formatOvers(bowler.ballsBowled);
    const bOversDecimal = oversToDecimal(bowler.ballsBowled);
    bowler.economy = bOversDecimal > 0 ? Number((bowler.runsConceded / bOversDecimal).toFixed(2)) : 0;
  }

  innings.oversFormatted = formatOvers(innings.legalDeliveries);
  innings.currentStrikerId = strikerId;
  innings.currentNonStrikerId = nonStrikerId;
  innings.currentBowlerId = currentBowlerId;
  innings.batters = Array.from(battersMap.values()).sort((a, b) => a.battingOrder - b.battingOrder);
  innings.bowlers = Array.from(bowlersMap.values());

  // Check if innings completed
  const totalMaxBalls = innings.maxOvers * 6;
  if (innings.legalDeliveries >= totalMaxBalls) {
    innings.isCompleted = true;
    innings.completionReason = `Overs limit (${innings.maxOvers} ov) completed`;
  } else if (innings.wickets >= innings.maxWickets) {
    innings.isCompleted = true;
    innings.completionReason = `All Out (${innings.wickets} wickets)`;
  }

  return innings;
}

/**
 * Process a new delivery into a Match, recalculate all stats, and check for win/completion
 */
export function processDelivery(
  match: Match,
  deliveryData: {
    runsBat: number;
    runsExtra?: number;
    extraType: ExtraType;
    isWicket: boolean;
    dismissal?: Dismissal;
    isBoundaryFour?: boolean;
    isBoundarySix?: boolean;
    bowlerId?: string;
    strikerId?: string;
    nonStrikerId?: string;
    newBatterId?: string;
    commentary?: string;
  }
): Match {
  // If match is completed, reject normal scoring!
  if (match.status === 'completed') {
    throw new Error('Match is already completed. Normal scoring is disabled.');
  }

  const currentIdx = match.currentInningsIndex;
  const currentInnings = match.innings[currentIdx];
  const battingTeam = currentIdx === 0 ? match.team1 : match.team2;
  const bowlingTeam = currentIdx === 0 ? match.team2 : match.team1;

  const strikerId = deliveryData.strikerId || currentInnings.currentStrikerId;
  const nonStrikerId = deliveryData.nonStrikerId || currentInnings.currentNonStrikerId;
  const bowlerId = deliveryData.bowlerId || currentInnings.currentBowlerId;

  const striker = battingTeam.squad.find((p) => p.id === strikerId) || { name: 'Striker' };
  const nonStriker = battingTeam.squad.find((p) => p.id === nonStrikerId) || { name: 'Non-Striker' };
  const bowler = bowlingTeam.squad.find((p) => p.id === bowlerId) || { name: 'Bowler' };

  const isLegal = deliveryData.extraType !== 'wide' && deliveryData.extraType !== 'noBall';

  // Odd runs rotate strike
  const totalRuns = (deliveryData.runsBat || 0) + (deliveryData.runsExtra || 0);
  const isOddRuns = (deliveryData.runsBat % 2 === 1) || (deliveryData.extraType === 'bye' && totalRuns % 2 === 1) || (deliveryData.extraType === 'legBye' && totalRuns % 2 === 1);
  const strikeRotated = isOddRuns;

  const deliveryId = `ball_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const legalBallIndex = (currentInnings.legalDeliveries % 6) + (isLegal ? 1 : 0);
  const overNumber = Math.floor(currentInnings.legalDeliveries / 6);

  let commentary = deliveryData.commentary;
  if (!commentary) {
    if (deliveryData.isWicket) {
      commentary = `WICKET! ${deliveryData.dismissal?.type?.toUpperCase()}! ${striker.name} departs!`;
    } else if (deliveryData.runsBat === 6) {
      commentary = `SIX! Glorious strike by ${striker.name} over the ropes!`;
    } else if (deliveryData.runsBat === 4) {
      commentary = `FOUR! Beautiful shot by ${striker.name} to the boundary!`;
    } else if (deliveryData.extraType === 'wide') {
      commentary = `Wide ball called by umpire.`;
    } else if (deliveryData.extraType === 'noBall') {
      commentary = `No ball! Free hit coming up.`;
    } else if (deliveryData.runsBat === 0) {
      commentary = `Dot ball. Bowled well by ${bowler.name}.`;
    } else {
      commentary = `${deliveryData.runsBat} run${deliveryData.runsBat > 1 ? 's' : ''} taken.`;
    }
  }

  const newBall: BallDelivery = {
    id: deliveryId,
    inningsIndex: currentIdx,
    overNumber,
    ballInOver: isLegal ? legalBallIndex : currentInnings.legalDeliveries % 6,
    bowlerId,
    bowlerName: bowler.name,
    strikerId,
    strikerName: striker.name,
    nonStrikerId,
    nonStrikerName: nonStriker.name,
    runsBat: deliveryData.runsBat || 0,
    runsExtra: deliveryData.runsExtra || (deliveryData.extraType === 'wide' || deliveryData.extraType === 'noBall' ? 1 : 0),
    extraType: deliveryData.extraType,
    isLegal,
    isWicket: deliveryData.isWicket,
    dismissal: deliveryData.dismissal,
    isBoundaryFour: !!deliveryData.isBoundaryFour || deliveryData.runsBat === 4,
    isBoundarySix: !!deliveryData.isBoundarySix || deliveryData.runsBat === 6,
    strikeRotated,
    commentary,
    timestamp: Date.now(),
  };

  const updatedDeliveries = [...currentInnings.deliveries, newBall];
  const updatedInnings = recalculateInnings(
    currentInnings,
    updatedDeliveries,
    battingTeam.squad,
    bowlingTeam.squad
  );

  const newInningsList: [Innings, Innings] = [...match.innings] as [Innings, Innings];
  newInningsList[currentIdx] = updatedInnings;

  let newStatus: Match['status'] = match.status === 'upcoming' ? 'live' : match.status;
  let newResult: MatchResult | undefined = match.result;
  let target = match.target;

  // If 1st innings just completed:
  if (currentIdx === 0 && updatedInnings.isCompleted) {
    target = updatedInnings.totalRuns + 1;
    newStatus = 'innings_break';
  }

  // If 2nd innings in progress: check target and match end!
  if (currentIdx === 1) {
    target = match.target || match.innings[0].totalRuns + 1;
    const team2Runs = updatedInnings.totalRuns;
    const team1Runs = match.innings[0].totalRuns;

    // RULE 1: Target reached! Team 2 wins immediately!
    if (team2Runs >= target) {
      newStatus = 'completed';
      updatedInnings.isCompleted = true;
      updatedInnings.completionReason = 'Target reached';

      const wicketsRemaining = match.innings[1].maxWickets - updatedInnings.wickets;
      const ballsRemaining = match.overs * 6 - updatedInnings.legalDeliveries;
      const margin = `won by ${wicketsRemaining} wicket${wicketsRemaining !== 1 ? 's' : ''} (${ballsRemaining} balls remaining)`;

      newResult = {
        winnerId: match.team2.id,
        winnerName: match.team2.name,
        winMargin: margin,
        summaryText: `${match.team2.name} ${margin}`,
      };
    }
    // RULE 2: Team 2 innings completed without reaching target
    else if (updatedInnings.isCompleted) {
      newStatus = 'completed';
      if (team2Runs < team1Runs) {
        const runMargin = team1Runs - team2Runs;
        const margin = `won by ${runMargin} run${runMargin !== 1 ? 's' : ''}`;
        newResult = {
          winnerId: match.team1.id,
          winnerName: match.team1.name,
          winMargin: margin,
          summaryText: `${match.team1.name} ${margin}`,
        };
      } else if (team2Runs === team1Runs) {
        newResult = {
          winMargin: 'Match Tied',
          summaryText: `Scores level at ${team1Runs} runs! Match Tied!`,
        };
      }
    }
  }

  const updatedMatch: Match = {
    ...match,
    innings: newInningsList,
    target,
    status: newStatus,
    result: newResult,
    updatedAt: Date.now(),
  };

  // If completed, compute Player of the Match
  if (newStatus === 'completed' && !updatedMatch.result?.playerOfTheMatch) {
    const potm = calculatePlayerOfTheMatch(updatedMatch);
    if (potm && updatedMatch.result) {
      updatedMatch.result.playerOfTheMatch = potm;
    }
  }

  return updatedMatch;
}

/**
 * Undo last delivery and recompute full match state
 */
export function undoLastDelivery(match: Match): Match {
  const currentIdx = match.currentInningsIndex;
  const currentInnings = match.innings[currentIdx];

  // If current innings has no balls, check if we can roll back from 2nd innings to 1st innings
  if (currentInnings.deliveries.length === 0) {
    if (currentIdx === 1) {
      // Revert back to 1st innings
      const prevInnings = match.innings[0];
      if (prevInnings.deliveries.length === 0) {
        return match;
      }
      const updatedDeliveries = prevInnings.deliveries.slice(0, -1);
      const recalculated = recalculateInnings(
        prevInnings,
        updatedDeliveries,
        match.team1.squad,
        match.team2.squad
      );
      return {
        ...match,
        innings: [recalculated, match.innings[1]],
        currentInningsIndex: 0,
        status: 'live',
        result: undefined,
        target: undefined,
        updatedAt: Date.now(),
      };
    }
    return match;
  }

  const updatedDeliveries = currentInnings.deliveries.slice(0, -1);
  const battingTeam = currentIdx === 0 ? match.team1 : match.team2;
  const bowlingTeam = currentIdx === 0 ? match.team2 : match.team1;

  const recalculated = recalculateInnings(
    currentInnings,
    updatedDeliveries,
    battingTeam.squad,
    bowlingTeam.squad
  );

  const newInningsList: [Innings, Innings] = [...match.innings] as [Innings, Innings];
  newInningsList[currentIdx] = recalculated;

  return {
    ...match,
    innings: newInningsList,
    status: 'live',
    result: undefined, // Clear winner if undoing after match end
    updatedAt: Date.now(),
  };
}

/**
 * Edit a specific historical delivery and recompute match
 */
export function editDelivery(
  match: Match,
  deliveryId: string,
  updatedFields: Partial<BallDelivery>
): Match {
  const currentIdx = match.currentInningsIndex;
  const inningsIdx = match.innings[0].deliveries.some((d) => d.id === deliveryId) ? 0 : 1;
  const targetInnings = match.innings[inningsIdx];

  const updatedDeliveries = targetInnings.deliveries.map((d) => {
    if (d.id === deliveryId) {
      return { ...d, ...updatedFields };
    }
    return d;
  });

  const battingTeam = inningsIdx === 0 ? match.team1 : match.team2;
  const bowlingTeam = inningsIdx === 0 ? match.team2 : match.team1;

  const recalculated = recalculateInnings(
    targetInnings,
    updatedDeliveries,
    battingTeam.squad,
    bowlingTeam.squad
  );

  const newInningsList: [Innings, Innings] = [...match.innings] as [Innings, Innings];
  newInningsList[inningsIdx] = recalculated;

  let newMatch: Match = {
    ...match,
    innings: newInningsList,
    updatedAt: Date.now(),
  };

  // Re-evaluate target and completion for Innings 2
  if (match.innings[1].deliveries.length > 0) {
    const target = newMatch.innings[0].totalRuns + 1;
    newMatch.target = target;
    const team2Runs = newMatch.innings[1].totalRuns;
    const team1Runs = newMatch.innings[0].totalRuns;

    if (team2Runs >= target) {
      newMatch.status = 'completed';
      const wkts = match.innings[1].maxWickets - newMatch.innings[1].wickets;
      const ballsRem = match.overs * 6 - newMatch.innings[1].legalDeliveries;
      newMatch.result = {
        winnerId: match.team2.id,
        winnerName: match.team2.name,
        winMargin: `won by ${wkts} wickets (${ballsRem} balls remaining)`,
        summaryText: `${match.team2.name} won by ${wkts} wickets`,
      };
    } else if (newMatch.innings[1].isCompleted) {
      newMatch.status = 'completed';
      if (team2Runs < team1Runs) {
        newMatch.result = {
          winnerId: match.team1.id,
          winnerName: match.team1.name,
          winMargin: `won by ${team1Runs - team2Runs} runs`,
          summaryText: `${match.team1.name} won by ${team1Runs - team2Runs} runs`,
        };
      }
    }
  }

  return newMatch;
}

/**
 * Transparent calculation of Player of the Match and MVP
 */
export function calculatePlayerOfTheMatch(match: Match): PlayerOfTheMatch | undefined {
  const allPlayers: { player: Player; team: Team }[] = [
    ...match.team1.squad.map((p) => ({ player: p, team: match.team1 })),
    ...match.team2.squad.map((p) => ({ player: p, team: match.team2 })),
  ];

  let bestPlayer: PlayerOfTheMatch | undefined;
  let highestScore = -1;

  allPlayers.forEach(({ player, team }) => {
    let battingPts = 0;
    let bowlingPts = 0;
    let fieldingPts = 0;
    let bonusPts = 0;

    // Batting stats across both innings
    match.innings.forEach((inn) => {
      const b = inn.batters.find((bt) => bt.playerId === player.id);
      if (b) {
        battingPts += b.runs * 1;
        battingPts += b.fours * 1;
        battingPts += b.sixes * 2;
        if (b.runs >= 100) bonusPts += 50;
        else if (b.runs >= 50) bonusPts += 25;
        else if (b.runs >= 30) bonusPts += 10;

        if (b.runs >= 20 && b.strikeRate >= 180) bonusPts += 15;
      }

      // Bowling stats
      const bw = inn.bowlers.find((bo) => bo.playerId === player.id);
      if (bw) {
        bowlingPts += bw.wickets * 25;
        bowlingPts += bw.maidens * 20;
        bowlingPts += bw.dots * 1;
        if (bw.wickets >= 5) bonusPts += 50;
        else if (bw.wickets >= 3) bonusPts += 25;

        const oversDec = oversToDecimal(bw.ballsBowled);
        if (oversDec >= 2 && bw.economy < 6.0) bonusPts += 15;
      }

      // Fielding stats (catches, run outs, stumpings from deliveries)
      inn.deliveries.forEach((del) => {
        if (del.dismissal?.assistedById === player.id) {
          if (del.dismissal.type === 'caught' || del.dismissal.type === 'caught_behind') {
            fieldingPts += 10;
          } else if (del.dismissal.type === 'stumped') {
            fieldingPts += 15;
          } else if (del.dismissal.type === 'run_out') {
            fieldingPts += 15;
          }
        }
      });
    });

    const totalPts = battingPts + bowlingPts + fieldingPts + bonusPts;
    if (totalPts > highestScore && totalPts > 10) {
      highestScore = totalPts;
      bestPlayer = {
        playerId: player.id,
        name: player.name,
        teamName: team.name,
        points: totalPts,
        breakdown: {
          batting: battingPts,
          bowling: bowlingPts,
          fielding: fieldingPts,
          bonuses: bonusPts,
        },
        summary: `${battingPts > 0 ? `${battingPts} bat pts ` : ''}${bowlingPts > 0 ? `${bowlingPts} bowl pts ` : ''}${fieldingPts > 0 ? `${fieldingPts} field pts` : ''}`,
      };
    }
  });

  return bestPlayer;
}

/**
 * Calculates Tournament Points Table with strict Cricket NRR rules
 */
export function calculatePointsTable(
  tournament: Tournament,
  matches: Match[],
  teams: Team[],
  groupId?: string
): PointsTableEntry[] {
  // Filter teams by group if specified
  let targetTeamIds = tournament.teamIds;
  if (groupId) {
    const group = tournament.groups.find((g) => g.id === groupId);
    if (group) targetTeamIds = group.teamIds;
  }

  const tableMap = new Map<string, PointsTableEntry>();

  targetTeamIds.forEach((tId) => {
    const team = teams.find((t) => t.id === tId) || {
      id: tId,
      name: `Team ${tId}`,
      shortName: 'TM',
      color: '#3B82F6',
    };

    tableMap.set(tId, {
      teamId: tId,
      teamName: team.name,
      shortName: team.shortName,
      color: team.color,
      played: 0,
      won: 0,
      lost: 0,
      tied: 0,
      noResult: 0,
      points: 0,
      runsScored: 0,
      oversFacedTotal: 0,
      runsConceded: 0,
      oversBowledTotal: 0,
      nrr: 0,
    });
  });

  // Filter completed tournament matches
  const tournamentMatches = matches.filter(
    (m) =>
      m.tournamentId === tournament.id &&
      (m.status === 'completed' || m.status === 'abandoned') &&
      (!groupId || (targetTeamIds.includes(m.team1.id) && targetTeamIds.includes(m.team2.id)))
  );

  tournamentMatches.forEach((m) => {
    const t1Entry = tableMap.get(m.team1.id);
    const t2Entry = tableMap.get(m.team2.id);

    if (!t1Entry || !t2Entry) return;

    if (m.status === 'abandoned') {
      t1Entry.played += 1;
      t2Entry.played += 1;
      t1Entry.noResult += 1;
      t2Entry.noResult += 1;
      t1Entry.points += tournament.rules.ptsNR;
      t2Entry.points += tournament.rules.ptsNR;
      return;
    }

    t1Entry.played += 1;
    t2Entry.played += 1;

    // Match results
    if (m.result?.winMargin === 'Match Tied') {
      t1Entry.tied += 1;
      t2Entry.tied += 1;
      t1Entry.points += tournament.rules.ptsTie;
      t2Entry.points += tournament.rules.ptsTie;
    } else if (m.result?.winnerId === m.team1.id) {
      t1Entry.won += 1;
      t1Entry.points += tournament.rules.ptsWin;
      t2Entry.lost += 1;
      t2Entry.points += tournament.rules.ptsLoss;
    } else if (m.result?.winnerId === m.team2.id) {
      t2Entry.won += 1;
      t2Entry.points += tournament.rules.ptsWin;
      t1Entry.lost += 1;
      t1Entry.points += tournament.rules.ptsLoss;
    }

    // NRR Calculations:
    // If all out, overs faced is considered full quota (e.g. 20.0)!
    const inn1 = m.innings[0];
    const inn2 = m.innings[1];

    const team1OversFaced =
      inn1.wickets >= inn1.maxWickets ? m.overs : oversToDecimal(inn1.legalDeliveries);
    const team2OversFaced =
      inn2.wickets >= inn2.maxWickets ? m.overs : oversToDecimal(inn2.legalDeliveries);

    t1Entry.runsScored += inn1.totalRuns;
    t1Entry.oversFacedTotal += team1OversFaced;
    t1Entry.runsConceded += inn2.totalRuns;
    t1Entry.oversBowledTotal += team2OversFaced;

    t2Entry.runsScored += inn2.totalRuns;
    t2Entry.oversFacedTotal += team2OversFaced;
    t2Entry.runsConceded += inn1.totalRuns;
    t2Entry.oversBowledTotal += team1OversFaced;
  });

  // Calculate final NRR for each team
  const result = Array.from(tableMap.values()).map((entry) => {
    const forRate = entry.oversFacedTotal > 0 ? entry.runsScored / entry.oversFacedTotal : 0;
    const againstRate = entry.oversBowledTotal > 0 ? entry.runsConceded / entry.oversBowledTotal : 0;
    const nrr = Number((forRate - againstRate).toFixed(3));
    return { ...entry, nrr };
  });

  // Sort by Points (descending), then NRR (descending), then Wins (descending)
  return result.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.nrr !== a.nrr) return b.nrr - a.nrr;
    return b.won - a.won;
  });
}
