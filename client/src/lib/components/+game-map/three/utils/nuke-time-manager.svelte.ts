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

// Helper to convert x,y to hex location string
function coordToHex(x: number, y: number): string {
  return toHexWithPadding(coordinatesToLocation({ x, y }));
}

// Mock nuke times for tutorial mode (in seconds)
// Keys are hex location strings matching land.locationString format
const TUTORIAL_MOCK_NUKE_TIMES: Record<string, number> = {};

// Initialize mock times with proper hex keys
function initMockTimes() {
  // 128,128 - player's land - 2 hours default
  TUTORIAL_MOCK_NUKE_TIMES[coordToHex(128, 128)] = 3600 * 2;
  // 127,127 - auction land - 3 days
  TUTORIAL_MOCK_NUKE_TIMES[coordToHex(127, 127)] = 86400 * 3;
  // 128,127 - 5 days
  TUTORIAL_MOCK_NUKE_TIMES[coordToHex(128, 127)] = 86400 * 5;
  // 127,128 - 2 days
  TUTORIAL_MOCK_NUKE_TIMES[coordToHex(127, 128)] = 86400 * 2;
  // 129,128 - to the right - 8 hours (will show NUKE for claim step)
  TUTORIAL_MOCK_NUKE_TIMES[coordToHex(129, 128)] = 3600 * 8;
  // 128,129 - 1 day
  TUTORIAL_MOCK_NUKE_TIMES[coordToHex(128, 129)] = 86400;
  // 129,129 - 6 days
  TUTORIAL_MOCK_NUKE_TIMES[coordToHex(129, 129)] = 86400 * 6;
  // 127,129 - 2 days 5 hours
  TUTORIAL_MOCK_NUKE_TIMES[coordToHex(127, 129)] = 86400 * 2 + 3600 * 5;
  // 129,127 - 4 days
  TUTORIAL_MOCK_NUKE_TIMES[coordToHex(129, 127)] = 86400 * 4;
}

// Hex location keys for specific tutorial lands
const PLAYER_LAND_HEX = coordToHex(128, 128);
const NEIGHBOR_NUKE_HEX = coordToHex(129, 128);

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
