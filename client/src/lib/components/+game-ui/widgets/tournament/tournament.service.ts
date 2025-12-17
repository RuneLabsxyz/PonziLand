import { PUBLIC_PONZI_API_URL } from '$env/static/public';
import {
  processLeaderboardEntries,
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

// Tournament start: Dec 15, 20:00 Paris time (CET = UTC+1) = 19:00 UTC
export const TOURNAMENT_START = '2025-12-15T19:00:00Z';

/**
 * Fetch tournament positions (since tournament start)
 */
export async function fetchTournamentLeaderboard(): Promise<LeaderboardResponse> {
  try {
    const response = await fetch(
      `${PUBLIC_PONZI_API_URL}/land-historical/leaderboard?since=${TOURNAMENT_START}`,
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch tournament leaderboard: ${response.statusText}`,
      );
    }

    const data = (await response.json()) as LeaderboardResponse;

    return {
      ...data,
      entries: processLeaderboardEntries(data.entries),
    };
  } catch (error) {
    console.error('Error fetching tournament leaderboard:', error);
    throw error;
  }
}
