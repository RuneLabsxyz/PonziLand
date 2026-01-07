import { BuildingLand } from '$lib/api/land/building_land';
import { landStore } from '$lib/stores/store.svelte';
import { createLandWithActions } from '$lib/utils/land-actions';
import { estimateNukeTimeRpc } from '$lib/utils/taxes';
import { parseNukeTimeComponents } from '$lib/utils/date';
import { SvelteMap } from 'svelte/reactivity';
import type { LandTile } from '../landTile';
import type { BaseLand } from '$lib/api/land';
import {
  tutorialAttribute,
  tutorialState,
} from '$lib/components/tutorial/stores.svelte';
import { coordinatesToLocation, toHexWithPadding } from '$lib/utils';
import { TUTORIAL_COORDS } from '$lib/components/tutorial/constants';

// Helper to convert x,y to hex location string
function coordToHex(x: number, y: number): string {
  return toHexWithPadding(coordinatesToLocation({ x, y }));
}

// Hex location keys derived from centralized constants
const PLAYER_LAND_HEX = coordToHex(
  TUTORIAL_COORDS.CENTER.x,
  TUTORIAL_COORDS.CENTER.y,
);
const NEIGHBOR_NUKE_HEX = coordToHex(
  TUTORIAL_COORDS.NEIGHBOR_TO_NUKE.x,
  TUTORIAL_COORDS.NEIGHBOR_TO_NUKE.y,
);

// Mock nuke times for tutorial mode (in seconds)
// Keys are hex location strings matching land.locationString format
const TUTORIAL_MOCK_NUKE_TIMES: Record<string, number> = {};

// Initialize mock times with proper hex keys using centralized coordinates
function initMockTimes() {
  const { CENTER, SECOND_AUCTION, FULL_AUCTION, NEIGHBOR_TO_NUKE } =
    TUTORIAL_COORDS;

  // 128,128 - Player's first land (center) - 2 hours default, nuke for shield demo
  TUTORIAL_MOCK_NUKE_TIMES[coordToHex(CENTER.x, CENTER.y)] = 3600 * 2;

  // 127,127 - Neighbor land (someone else bought it) - 3 days
  TUTORIAL_MOCK_NUKE_TIMES[coordToHex(SECOND_AUCTION.x, SECOND_AUCTION.y)] =
    86400 * 3;

  // 127,128 - Third auction (full buy modal) - directly left of center - 4 days
  TUTORIAL_MOCK_NUKE_TIMES[coordToHex(FULL_AUCTION.x, FULL_AUCTION.y)] =
    86400 * 4;

  // Neighbor lands (spawned in phase 3):
  // 129,128 - right neighbor - will show NUKE for claim step
  TUTORIAL_MOCK_NUKE_TIMES[coordToHex(NEIGHBOR_TO_NUKE.x, NEIGHBOR_TO_NUKE.y)] =
    3600 * 8;
  // 128,129 - below neighbor - 1 day
  TUTORIAL_MOCK_NUKE_TIMES[coordToHex(CENTER.x, CENTER.y + 1)] = 86400;
  // 128,127 - above neighbor - 5 days
  TUTORIAL_MOCK_NUKE_TIMES[coordToHex(CENTER.x, CENTER.y - 1)] = 86400 * 5;
  // 129,129 - diagonal neighbor - 6 days
  TUTORIAL_MOCK_NUKE_TIMES[coordToHex(CENTER.x + 1, CENTER.y + 1)] = 86400 * 6;
}

// Initialize on module load
initMockTimes();

export interface NukeTimeData {
  text: string;
  position: [number, number, number];
  shieldType: 'blue' | 'grey' | 'yellow' | 'orange' | 'red' | 'nuke';
  timeInSeconds?: number;
}

export interface MinimalLandTile {
  position: [number, number, number];
  land: BaseLand & {
    locationString: string;
  };
}

interface CachedNukeTime {
  timeInSeconds: number;
  lastCalculated: number;
}

export class NukeTimeManager {
  private cache = $state(new SvelteMap<string, CachedNukeTime>());
  private rpcBatchQueue = $state(new Set<string>());
  private batchTimer: ReturnType<typeof setTimeout> | null = null;
  private updateTimer: ReturnType<typeof setInterval> | null = null;

  private readonly BATCH_DELAY = 100; // 100ms delay to batch RPC calls
  private readonly CACHE_DURATION = 30000; // 30 seconds
  private readonly UPDATE_INTERVAL = 5000; // 5 seconds

  constructor() {}

  /**
   * Get shield type based on days remaining
   */
  private getShieldType(days: number): NukeTimeData['shieldType'] {
    if (days >= 5) return 'blue';
    if (days >= 3) return 'grey';
    if (days >= 2) return 'yellow';
    if (days >= 1) return 'orange';
    return 'red';
  }

  /**
   * Format nuke time for display
   */
  private formatNukeTime(timeInSeconds: number): {
    text: string;
    shieldType: NukeTimeData['shieldType'];
  } {
    const parsedTime = parseNukeTimeComponents(timeInSeconds);

    let displayText = '';
    if (parsedTime.days > 0) {
      displayText = `${parsedTime.days}d`;
    } else if (parsedTime.hours > 0) {
      displayText = `${parsedTime.hours}h`;
    } else if (parsedTime.minutes > 0) {
      displayText = `${parsedTime.minutes}m`;
    } else {
      displayText = 'NUKE!';
    }

    const shieldType = this.getShieldType(parsedTime.days);
    return { text: displayText, shieldType };
  }

  /**
   * Process RPC batch
   */
  private async processBatch(landTiles: LandTile[]) {
    if (this.rpcBatchQueue.size === 0) return;

    const locations = Array.from(this.rpcBatchQueue);
    this.rpcBatchQueue.clear();
    this.batchTimer = null;

    // Process each location
    await Promise.all(
      locations.map(async (locationKey) => {
        const tile = landTiles.find(
          (t) => t.land.locationString === locationKey,
        );
        if (!tile || !BuildingLand.is(tile.land)) return;

        try {
          const landWithActions = createLandWithActions(
            tile.land,
            landStore.getAllLands,
          );

          // Use RPC algorithm with elapsed times fetched internally
          const timeInSeconds = await estimateNukeTimeRpc(landWithActions);

          // Update cache
          this.cache.set(locationKey, {
            timeInSeconds,
            lastCalculated: Date.now(),
          });

          // Force reactivity update
          this.cache = new SvelteMap(this.cache);
        } catch (error) {
          console.warn('Failed to fetch nuke time for:', locationKey, error);
        }
      }),
    );
  }

  /**
   * Queue an RPC call for a location
   */
  private queueRPCCall(locationKey: string, landTiles: LandTile[]) {
    this.rpcBatchQueue.add(locationKey);

    // Clear existing timer
    if (this.batchTimer !== null) {
      clearTimeout(this.batchTimer);
    }

    // Set new timer to process batch
    this.batchTimer = setTimeout(() => {
      this.processBatch(landTiles);
    }, this.BATCH_DELAY);
  }

  /**
   * Get mock nuke time for tutorial mode
   */
  private getTutorialMockTime(locationKey: string): number {
    // Player's land (128,128) - shows NUKE when player_land_nuke attribute is set
    if (locationKey === PLAYER_LAND_HEX) {
      if (tutorialAttribute('player_land_nuke').has) {
        return 30; // 30 seconds = shows "NUKE!"
      }
      return TUTORIAL_MOCK_NUKE_TIMES[PLAYER_LAND_HEX] ?? 3600 * 2;
    }

    // Neighbor land (129,128) - to the right - shows NUKE when neighbor_land_nuke attribute is set
    if (
      locationKey === NEIGHBOR_NUKE_HEX &&
      tutorialAttribute('neighbor_land_nuke').has
    ) {
      return 30; // 30 seconds = shows "NUKE!"
    }

    return TUTORIAL_MOCK_NUKE_TIMES[locationKey] ?? 86400 * 2; // Default 2 days
  }

  /**
   * Calculate nuke time data for visible tiles
   */
  calculateNukeTimeData(
    visibleNukeTiles: MinimalLandTile[],
    landTiles: LandTile[],
  ): SvelteMap<string, NukeTimeData> {
    const dataMap = new SvelteMap<string, NukeTimeData>();

    for (const tile of visibleNukeTiles) {
      try {
        const locationKey = tile.land.locationString;

        // In tutorial mode, use mock times instead of RPC calls
        if (tutorialState.tutorialEnabled) {
          const mockTime = this.getTutorialMockTime(locationKey);
          const { text, shieldType } = this.formatNukeTime(mockTime);
          dataMap.set(locationKey, {
            text,
            position: [
              tile.position[0],
              tile.position[1] + 0.1,
              tile.position[2],
            ],
            shieldType,
            timeInSeconds: mockTime,
          });
          continue;
        }

        const cachedResult = this.cache.get(locationKey);

        // Check if cache is valid
        const now = Date.now();
        const isCacheValid =
          cachedResult &&
          now - cachedResult.lastCalculated < this.CACHE_DURATION;

        if (isCacheValid) {
          // Use cached result
          const { text, shieldType } = this.formatNukeTime(
            cachedResult.timeInSeconds,
          );
          dataMap.set(locationKey, {
            text,
            position: [
              tile.position[0],
              tile.position[1] + 0.1,
              tile.position[2],
            ],
            shieldType,
            timeInSeconds: cachedResult.timeInSeconds,
          });
        } else {
          // Cache is invalid, queue RPC call
          this.queueRPCCall(locationKey, landTiles);
          dataMap.set(locationKey, {
            text: '...',
            position: [
              tile.position[0],
              tile.position[1] + 0.1,
              tile.position[2],
            ],
            shieldType: 'grey',
          });
        }
      } catch (error) {
        console.warn(
          'Failed to process nuke time for tile:',
          tile.land.locationString,
          error,
        );
        dataMap.set(tile.land.locationString, {
          text: '?',
          position: [
            tile.position[0],
            tile.position[1] + 0.1,
            tile.position[2],
          ],
          shieldType: 'grey',
        });
      }
    }

    return dataMap;
  }

  /**
   * Start periodic updates for visible tiles
   */
  startPeriodicUpdates(
    visibleNukeTiles: MinimalLandTile[],
    landTiles: LandTile[],
  ) {
    this.stopPeriodicUpdates();

    this.updateTimer = setInterval(() => {
      for (const tile of visibleNukeTiles) {
        const locationKey = tile.land.locationString;
        const cached = this.cache.get(locationKey);

        // Update if cache is stale
        if (
          !cached ||
          Date.now() - cached.lastCalculated >= this.CACHE_DURATION - 5000
        ) {
          this.queueRPCCall(locationKey, landTiles);
        }
      }
    }, this.UPDATE_INTERVAL);
  }

  /**
   * Stop periodic updates
   */
  stopPeriodicUpdates() {
    if (this.updateTimer !== null) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.batchTimer !== null) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    this.stopPeriodicUpdates();
    this.cache.clear();
    this.rpcBatchQueue.clear();
  }
}

// Create singleton instance
export const nukeTimeManager = new NukeTimeManager();
