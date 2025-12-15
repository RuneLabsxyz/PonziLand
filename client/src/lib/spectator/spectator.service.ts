import { PUBLIC_PONZI_API_URL } from '$env/static/public';

export interface LandHistoricalResponse {
  id: string;
  owner: string;
  land_location: number;
  time_bought: string;
  close_date: string | null;
  close_reason: 'nuked' | 'bought' | null;
  buy_cost_token: string | null;
  buy_cost_usd: string | null;
  buy_token_used: string | null;
  sale_revenue_token: string | null;
  sale_revenue_usd: string | null;
  sale_token_used: string | null;
  net_profit_token: string | null;
  net_profit_usd: string | null;
  token_inflows: Record<string, string>;
  token_outflows: Record<string, string>;
}

export interface LeaderboardEntry {
  owner: string;
  total_positions: number;
  positions: LandHistoricalResponse[];
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  since: string;
  until: string | null;
}

export interface SnapshotResponse {
  at: string;
  lands: LandHistoricalResponse[];
}

/**
 * Fetch the map snapshot at a specific time
 * Returns all lands that were owned at that timestamp
 */
export async function fetchSnapshot(at: string): Promise<SnapshotResponse> {
  const url = `${PUBLIC_PONZI_API_URL}/land-historical/snapshot?at=${encodeURIComponent(at)}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch snapshot: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch all position changes (timeline events) during a period
 * These are closed positions that represent ownership changes
 */
export async function fetchTimelineData(
  since: string,
  until: string,
): Promise<LeaderboardResponse> {
  const url = `${PUBLIC_PONZI_API_URL}/land-historical/leaderboard?since=${encodeURIComponent(since)}&until=${encodeURIComponent(until)}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch timeline data: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Initialize replay data by fetching both snapshot and timeline
 */
export async function initializeReplay(
  startTime: string,
  endTime: string,
): Promise<{
  snapshot: SnapshotResponse;
  timeline: LeaderboardResponse;
}> {
  const [snapshot, timeline] = await Promise.all([
    fetchSnapshot(startTime),
    fetchTimelineData(startTime, endTime),
  ]);

  return { snapshot, timeline };
}

/**
 * Helper to format date to ISO string for API calls
 */
export function formatDateForAPI(date: Date): string {
  return date.toISOString().slice(0, 19); // Remove timezone part
}

/**
 * Calculate a default time range for replay
 * Default: last 24 hours
 */
export function getDefaultTimeRange(): { start: string; end: string } {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  return {
    start: formatDateForAPI(yesterday),
    end: formatDateForAPI(now),
  };
}
