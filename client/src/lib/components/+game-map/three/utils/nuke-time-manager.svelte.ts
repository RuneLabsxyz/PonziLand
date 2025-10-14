import { BuildingLand } from '$lib/api/land/building_land';
import { landStore } from '$lib/stores/store.svelte';
import { createLandWithActions } from '$lib/utils/land-actions';
import { estimateNukeTimeSync, parseNukeTime } from '$lib/utils/taxes';
import { SvelteMap } from 'svelte/reactivity';
import type { LandTile } from '../landTile';

export interface NukeTimeData {
  text: string;
  position: [number, number, number];
  shieldType: 'blue' | 'grey' | 'yellow' | 'orange' | 'red' | 'nuke';
  timeInSeconds?: number;
}

interface CachedNukeTime {
  timeInSeconds: number;
  lastCalculated: number;
  elapsedTimes?: any[];
  minElapsedTime?: number;
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
    const parsedTime = parseNukeTime(timeInSeconds);

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

          // Get elapsed times (RPC call)
          const elapsedTimes =
            await landWithActions.getElapsedTimeSinceLastClaimForNeighbors();

          // Calculate min elapsed time
          const minElapsedTime = elapsedTimes?.length
            ? Math.min(...elapsedTimes.map((neighbor) => Number(neighbor[1])))
            : undefined;

          // Get neighbor count
          const neighborCount =
            landWithActions.getNeighbors()?.getBaseLandsArray()?.length || 0;

          // Calculate nuke time synchronously using cached data
          const timeInSeconds = estimateNukeTimeSync(
            landWithActions,
            neighborCount,
            minElapsedTime,
          );

          // Update cache
          this.cache.set(locationKey, {
            timeInSeconds,
            lastCalculated: Date.now(),
            elapsedTimes,
            minElapsedTime,
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
   * Calculate nuke time data for visible tiles
   */
  calculateNukeTimeData(
    visibleNukeTiles: LandTile[],
    landTiles: LandTile[],
  ): SvelteMap<string, NukeTimeData> {
    const dataMap = new SvelteMap<string, NukeTimeData>();

    for (const tile of visibleNukeTiles) {
      try {
        const locationKey = tile.land.locationString;
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
          // Try to calculate synchronously if we have neighbors info
          const landWithActions = createLandWithActions(
            tile.land as BuildingLand,
            landStore.getAllLands,
          );
          const neighborCount =
            landWithActions.getNeighbors()?.getBaseLandsArray()?.length || 0;

          if (neighborCount > 0) {
            // If we have cached elapsed times, use them
            if (cachedResult?.minElapsedTime !== undefined) {
              const timeInSeconds = estimateNukeTimeSync(
                landWithActions,
                neighborCount,
                cachedResult.minElapsedTime,
              );
              const { text, shieldType } = this.formatNukeTime(timeInSeconds);
              dataMap.set(locationKey, {
                text,
                position: [
                  tile.position[0],
                  tile.position[1] + 0.1,
                  tile.position[2],
                ],
                shieldType,
                timeInSeconds,
              });
            } else {
              // Queue RPC call and show placeholder
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
          }
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
  startPeriodicUpdates(visibleNukeTiles: LandTile[], landTiles: LandTile[]) {
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
