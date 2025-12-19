import {
  PUBLIC_PONZI_API_URL,
  PUBLIC_TOURNAMENT_START,
} from '$env/static/public';
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

// Re-export for components that need it
export const TOURNAMENT_START = PUBLIC_TOURNAMENT_START;

/**
 * Fetch tournament positions (since tournament start)
 */
export async function fetchTournamentLeaderboard(): Promise<LeaderboardResponse> {
  try {
    const response = await fetch(
      `${PUBLIC_PONZI_API_URL}/land-historical/leaderboard?since=${PUBLIC_TOURNAMENT_START}`,
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
