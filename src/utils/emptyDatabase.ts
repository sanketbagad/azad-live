import { AppDatabase } from '../types/cricket';

/** A fresh database with no tournaments, teams, players, matches or accounts. */
export function createEmptyDatabase(): AppDatabase {
  return {
    matches: {},
    tournaments: {},
    teams: {},
    players: {},
    users: {},
    auctionSyncMap: {},
    lastUpdated: Date.now(),
  };
}
