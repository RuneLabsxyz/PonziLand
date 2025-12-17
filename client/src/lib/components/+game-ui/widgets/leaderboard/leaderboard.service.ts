import { PUBLIC_PONZI_API_URL } from '$env/static/public';
import { calculatePositionMetrics } from '../positions/position-pnl-calculator';
import type {
  LeaderboardEntry,
  LeaderboardResponse,
  RankingMode,
  MetricType,
} from '../tournament/tournament.service';

// Re-export types for convenience
export type { LeaderboardEntry, LeaderboardResponse, RankingMode, MetricType };
export { sortEntriesByRankingMode } from '../tournament/tournament.service';

// Game launch: October 1, 2025
const GAME_LAUNCH = '2025-10-01T00:00:00Z';

/**
 * Fetch all historical positions since game launch
 */
export async function fetchLeaderboard(): Promise<LeaderboardResponse> {
  try {
    const response = await fetch(
      `${PUBLIC_PONZI_API_URL}/land-historical/leaderboard?since=${GAME_LAUNCH}`,
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch leaderboard: ${response.statusText}`);
    }

    const data = (await response.json()) as LeaderboardResponse;

    // Calculate metrics for each position within each entry
    const entriesWithMetrics = data.entries.map((entry) => {
      const positionsWithMetrics = entry.positions.map((pos) => ({
        ...pos,
        metrics: calculatePositionMetrics(pos),
      }));

      // Calculate aggregate PnL metrics (includes buy/sell costs)
      const pnlValues = positionsWithMetrics
        .map((p) => p.metrics?.totalPnL?.rawValue().toNumber() ?? null)
        .filter((v): v is number => v !== null);

      const bestPnL = pnlValues.length > 0 ? Math.max(...pnlValues) : 0;
      const totalPnL = pnlValues.reduce((sum, v) => sum + v, 0);

      // Calculate aggregate Token Flow metrics (excludes buy/sell costs)
      const tokenFlowValues = positionsWithMetrics
        .map((p) => p.metrics?.netTokenFlow?.rawValue().toNumber() ?? null)
        .filter((v): v is number => v !== null);

      const bestTokenFlow =
        tokenFlowValues.length > 0 ? Math.max(...tokenFlowValues) : 0;
      const totalTokenFlow = tokenFlowValues.reduce((sum, v) => sum + v, 0);

      return {
        ...entry,
        positions: positionsWithMetrics,
        bestPnL,
        totalPnL,
        bestTokenFlow,
        totalTokenFlow,
      };
    });

    return {
      ...data,
      entries: entriesWithMetrics,
    };
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    throw error;
  }
}
