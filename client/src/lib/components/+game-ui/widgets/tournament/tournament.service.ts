import {
  PUBLIC_TOURNAMENT_END,
  PUBLIC_TOURNAMENT_START,
} from '$env/static/public';
import {
  tournamentLeaderboard,
  type LeaderboardResponse,
} from '../leaderboard/leaderboard.service';

// Re-export types from leaderboard for convenience
export type {
  TokenFlow,
  LeaderboardPosition,
  LeaderboardEntry,
  LeaderboardResponse,
  RankingMode,
  MetricType,
} from '../leaderboard/leaderboard.service';
export { sortEntriesByRankingMode } from '../leaderboard/leaderboard.service';

// Re-export for components that need it
export const TOURNAMENT_START = PUBLIC_TOURNAMENT_START;
export const TOURNAMENT_END = PUBLIC_TOURNAMENT_END;

/**
 * Fetch tournament positions (since tournament start)
 */
export async function fetchTournamentLeaderboard(): Promise<LeaderboardResponse> {
  return tournamentLeaderboard.fetch();
}
