import { PUBLIC_PONZI_API_URL } from '$env/static/public';
import {
  calculatePositionMetrics,
  type PositionMetrics,
} from '../positions/position-pnl-calculator';

// Tournament start: Dec 15, 20:00 Paris time (CET = UTC+1) = 19:00 UTC
export const TOURNAMENT_START = '2025-12-15T19:00:00Z';

export interface TokenFlow {
  [tokenAddress: string]: string;
}

export interface TournamentPosition {
  id: string;
  owner: string;
  land_location: number;
  time_bought: string;
  close_date: string;
  close_reason: 'bought' | 'nuked';
  buy_cost_token: string;
  buy_cost_usd: null;
  buy_token_used: string | null;
  sale_revenue_token: string | null;
  sale_revenue_usd: null;
  sale_token_used: string | null;
  net_profit_token: string | null;
  net_profit_usd: null;
  token_inflows: TokenFlow;
  token_outflows: TokenFlow;
  metrics?: PositionMetrics;
}

export interface LeaderboardEntry {
  owner: string;
  total_positions: number;
  positions: TournamentPosition[];
  // Computed fields - Full PnL (includes buy/sell costs)
  bestPnL?: number;
  totalPnL?: number;
  // Computed fields - Token Flow only (excludes buy/sell costs)
  bestTokenFlow?: number;
  totalTokenFlow?: number;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  since: string;
}

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
    console.error('Error fetching tournament leaderboard:', error);
    throw error;
  }
}

export type RankingMode = 'best' | 'total';
export type MetricType = 'pnl' | 'tokenFlow';

export function sortEntriesByRankingMode(
  entries: LeaderboardEntry[],
  mode: RankingMode,
  metricType: MetricType = 'pnl',
): LeaderboardEntry[] {
  const sorted = [...entries];

  if (metricType === 'tokenFlow') {
    // Sort by token flow (excludes buy/sell)
    if (mode === 'best') {
      sorted.sort((a, b) => (b.bestTokenFlow ?? 0) - (a.bestTokenFlow ?? 0));
    } else {
      sorted.sort((a, b) => (b.totalTokenFlow ?? 0) - (a.totalTokenFlow ?? 0));
    }
  } else {
    // Sort by PnL (includes buy/sell)
    if (mode === 'best') {
      sorted.sort((a, b) => (b.bestPnL ?? 0) - (a.bestPnL ?? 0));
    } else {
      sorted.sort((a, b) => (b.totalPnL ?? 0) - (a.totalPnL ?? 0));
    }
  }

  return sorted;
}
