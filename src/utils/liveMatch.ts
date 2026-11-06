import type { BallDelivery, Innings, Match, Team } from '../types/cricket';
import { calculateRequiredRunRate, calculateRunRate, formatOvers } from './cricketEngine';

/** Runs a delivery added to the total (bat + extras). */
export const ballRuns = (b: BallDelivery) => b.runsBat + b.runsExtra;

export function inningsTeams(match: Match, inn: Innings): { batting: Team; bowling: Team } {
  const batting = inn.battingTeamId === match.team2.id ? match.team2 : match.team1;
  const bowling = batting.id === match.team1.id ? match.team2 : match.team1;
  return { batting, bowling };
}

/** Short label shown inside a ball chip: "4", "W", "1wd", "nb4", "2lb", "•" */
export function ballLabel(b: BallDelivery): string {
  if (b.isWicket) return 'W';
  switch (b.extraType) {
    case 'wide':
      return b.runsExtra > 1 ? `${b.runsExtra}wd` : 'wd';
    case 'noBall':
      return b.runsBat > 0 ? `nb${b.runsBat}` : 'nb';
    case 'bye':
      return `${b.runsExtra}b`;
    case 'legBye':
      return `${b.runsExtra}lb`;
    case 'penalty':
      return `${b.runsExtra}p`;
    default:
      return b.runsBat === 0 ? '•' : String(b.runsBat);
  }
}

export type BallKind = 'wicket' | 'six' | 'four' | 'extra' | 'dot' | 'runs';

export function ballKind(b: BallDelivery): BallKind {
  if (b.isWicket) return 'wicket';
  if (b.isBoundarySix || (b.runsBat === 6 && b.extraType === 'none')) return 'six';
  if (b.isBoundaryFour || (b.runsBat === 4 && b.extraType === 'none')) return 'four';
  if (b.extraType !== 'none') return 'extra';
  if (b.runsBat === 0) return 'dot';
  return 'runs';
}

/** "4.3" style over.ball for a delivery */
export const ballOverLabel = (b: BallDelivery) => `${b.overNumber}.${b.ballInOver}`;

/** Score (runs/wickets) after each delivery, aligned with inn.deliveries. */
export function runningScores(inn: Innings): { runs: number; wickets: number }[] {
  let runs = 0;
  let wickets = 0;
  return inn.deliveries.map((b) => {
    runs += ballRuns(b);
    if (b.isWicket) wickets += 1;
    return { runs, wickets };
  });
}

export interface OverSummary {
  over: number; // 0-based
  balls: BallDelivery[];
  runs: number;
  wickets: number;
  bowlerName: string;
  /** Innings score at the end of this over */
  scoreAfter: { runs: number; wickets: number };
  isComplete: boolean;
}

export function oversSummary(inn: Innings): OverSummary[] {
  const scores = runningScores(inn);
  const byOver = new Map<number, OverSummary>();
  inn.deliveries.forEach((b, i) => {
    let o = byOver.get(b.overNumber);
    if (!o) {
      o = { over: b.overNumber, balls: [], runs: 0, wickets: 0, bowlerName: b.bowlerName, scoreAfter: scores[i], isComplete: false };
      byOver.set(b.overNumber, o);
    }
    o.balls.push(b);
    o.runs += ballRuns(b);
    if (b.isWicket) o.wickets += 1;
    o.scoreAfter = scores[i];
  });
  const list = [...byOver.values()].sort((a, b) => a.over - b.over);
  list.forEach((o) => {
    o.isComplete = o.balls.filter((b) => b.isLegal).length >= 6;
  });
  return list;
}

/** Deliveries of the over in progress (or the last completed over if a new one hasn't started). */
export function currentOverBalls(inn: Innings): BallDelivery[] {
  if (inn.deliveries.length === 0) return [];
  const lastOver = inn.deliveries[inn.deliveries.length - 1].overNumber;
  return inn.deliveries.filter((b) => b.overNumber === lastOver);
}

export function partnership(inn: Innings): { runs: number; balls: number } {
  let runs = 0;
  let balls = 0;
  for (let i = inn.deliveries.length - 1; i >= 0; i--) {
    const b = inn.deliveries[i];
    if (b.isWicket) break;
    runs += ballRuns(b);
    if (b.isLegal) balls += 1;
  }
  return { runs, balls };
}

export interface ChaseInfo {
  target: number;
  runsNeeded: number;
  ballsLeft: number;
  rrr: number | null;
}

export function chaseInfo(match: Match): ChaseInfo | null {
  if (match.currentInningsIndex !== 1 || !match.target) return null;
  const inn = match.innings[1];
  const runsNeeded = Math.max(0, match.target - inn.totalRuns);
  const ballsLeft = Math.max(0, match.overs * 6 - inn.legalDeliveries);
  return { target: match.target, runsNeeded, ballsLeft, rrr: calculateRequiredRunRate(runsNeeded, ballsLeft) };
}

/** Projected first-innings total at the current run rate. */
export function projectedScore(match: Match): number | null {
  if (match.currentInningsIndex !== 0) return null;
  const inn = match.innings[0];
  if (inn.legalDeliveries < 6) return null;
  const crr = calculateRunRate(inn.totalRuns, inn.legalDeliveries);
  const oversLeft = Math.max(0, (match.overs * 6 - inn.legalDeliveries) / 6);
  return Math.round(inn.totalRuns + crr * oversLeft);
}

/** One-line situation summary, like a TV ticker. */
export function situationText(match: Match): string {
  if (match.status === 'completed') return match.result?.summaryText || 'Match completed';
  if (match.status === 'abandoned') return 'Match abandoned';
  if (match.status === 'upcoming') {
    return match.toss
      ? `${match.toss.wonByName} won the toss and chose to ${match.toss.decision}`
      : 'Match yet to begin';
  }
  if (match.status === 'innings_break') {
    return match.target ? `Innings break · Target ${match.target}` : 'Innings break';
  }
  const chase = chaseInfo(match);
  if (chase) {
    const { batting } = inningsTeams(match, match.innings[1]);
    if (chase.runsNeeded === 0) return `${batting.shortName} have reached the target`;
    return `${batting.shortName} need ${chase.runsNeeded} run${chase.runsNeeded === 1 ? '' : 's'} from ${chase.ballsLeft} ball${chase.ballsLeft === 1 ? '' : 's'}`;
  }
  const projected = projectedScore(match);
  const inn = match.innings[match.currentInningsIndex];
  const { batting } = inningsTeams(match, inn);
  return projected !== null
    ? `${batting.shortName} batting · Projected ${projected} at ${calculateRunRate(inn.totalRuns, inn.legalDeliveries).toFixed(2)} RPO`
    : `${batting.shortName} batting first`;
}

export { formatOvers };
