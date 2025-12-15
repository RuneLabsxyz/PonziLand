import type {
  LeaderboardResponse,
  LandHistoricalResponse,
} from './spectator.service';

export type ReplayEventType = 'buy' | 'nuke' | 'sold';

export interface ReplayEvent {
  time: Date;
  type: ReplayEventType;
  location: number;
  owner?: string;
  token?: string;
  position?: LandHistoricalResponse;
}

/**
 * Build a sorted timeline of events from leaderboard data
 * Each position generates:
 * - A "buy" event at time_bought (when land was acquired)
 * - A close event (nuke/sold) at close_date (when position ended)
 */
export function buildTimeline(response: LeaderboardResponse): ReplayEvent[] {
  const events: ReplayEvent[] = [];

  for (const entry of response.entries) {
    for (const pos of entry.positions) {
      // Buy event (land acquired)
      events.push({
        time: new Date(pos.time_bought),
        type: 'buy',
        location: pos.land_location,
        owner: pos.owner,
        token: pos.buy_token_used || undefined,
        position: pos,
      });

      // Close event (nuked or sold)
      if (pos.close_date) {
        events.push({
          time: new Date(pos.close_date),
          type: pos.close_reason === 'nuked' ? 'nuke' : 'sold',
          location: pos.land_location,
          position: pos,
        });
      }
    }
  }

  // Sort events chronologically
  return events.sort((a, b) => a.time.getTime() - b.time.getTime());
}

/**
 * Get all events up to a specific time
 */
export function getEventsUpTo(
  events: ReplayEvent[],
  targetTime: Date,
): ReplayEvent[] {
  return events.filter((event) => event.time.getTime() <= targetTime.getTime());
}

/**
 * Get events between two times
 */
export function getEventsBetween(
  events: ReplayEvent[],
  startTime: Date,
  endTime: Date,
): ReplayEvent[] {
  return events.filter(
    (event) =>
      event.time.getTime() > startTime.getTime() &&
      event.time.getTime() <= endTime.getTime(),
  );
}

/**
 * Calculate the real time elapsed for a given replay progress
 * @param startTime - Start of replay period
 * @param endTime - End of replay period
 * @param progress - Progress from 0 to 1
 */
export function getTimeAtProgress(
  startTime: Date,
  endTime: Date,
  progress: number,
): Date {
  const duration = endTime.getTime() - startTime.getTime();
  return new Date(startTime.getTime() + duration * progress);
}

/**
 * Calculate progress from a given time
 */
export function getProgressFromTime(
  startTime: Date,
  endTime: Date,
  currentTime: Date,
): number {
  const duration = endTime.getTime() - startTime.getTime();
  const elapsed = currentTime.getTime() - startTime.getTime();
  return Math.max(0, Math.min(1, elapsed / duration));
}

/**
 * Calculate how much real time has passed given elapsed replay time and speed
 * Example: 1 day replayed at 48x speed = 30 minutes
 * @param replaySpeed - Multiplier (e.g., 48 means 48x speed)
 * @param replayDurationMs - Duration of replay period in milliseconds
 * @returns Total real time in milliseconds the replay will take
 */
export function calculateReplayDuration(
  replaySpeed: number,
  replayDurationMs: number,
): number {
  return replayDurationMs / replaySpeed;
}

/**
 * Pre-defined replay presets
 */
export const REPLAY_PRESETS = {
  '1h': { label: '1 Hour', durationMs: 60 * 60 * 1000 },
  '6h': { label: '6 Hours', durationMs: 6 * 60 * 60 * 1000 },
  '1d': { label: '1 Day', durationMs: 24 * 60 * 60 * 1000 },
  '3d': { label: '3 Days', durationMs: 3 * 24 * 60 * 60 * 1000 },
  '1w': { label: '1 Week', durationMs: 7 * 24 * 60 * 60 * 1000 },
} as const;

export type ReplayPreset = keyof typeof REPLAY_PRESETS;

/**
 * Speed multipliers for replay
 * At 48x, 1 day plays back in 30 minutes
 */
export const SPEED_OPTIONS = [
  { value: 1, label: '1x' },
  { value: 2, label: '2x' },
  { value: 4, label: '4x' },
  { value: 8, label: '8x' },
  { value: 16, label: '16x' },
  { value: 48, label: '48x' },
  { value: 96, label: '96x' },
] as const;
