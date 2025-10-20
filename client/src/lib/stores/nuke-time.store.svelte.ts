import { BuildingLand } from '$lib/api/land/building_land';
import { landStore } from '$lib/stores/store.svelte';
import { padAddress } from '$lib/utils';
import { createLandWithActions } from '$lib/utils/land-actions';
import type { LandTile } from '$lib/components/+game-map/three/landTile';
import {
  nukeTimeManager,
  type NukeTimeData,
} from '$lib/components/+game-map/three/utils/nuke-time-manager.svelte';
import { SvelteMap } from 'svelte/reactivity';

class NukeTimeStore {
  private _landTiles = $state<LandTile[]>([]);
  private _isShieldMode = $state(false);
  private _isUnzoomed = $state(false);
  private _currentUserAddress = $state<string | undefined>(undefined);

  constructor() {}

  // Setters for external data
  setLandTiles(tiles: LandTile[]) {
    this._landTiles = tiles;
  }

  setDisplayMode(isShieldMode: boolean, isUnzoomed: boolean) {
    this._isShieldMode = isShieldMode;
    this._isUnzoomed = isUnzoomed;
  }

  setCurrentUserAddress(address: string | undefined) {
    this._currentUserAddress = address;
  }

  // Check if the current user owns the land tile
  private isOwnedByCurrentUser(tile: LandTile): boolean {
    if (!this._currentUserAddress || !BuildingLand.is(tile.land)) return false;
    return padAddress(tile.land.owner) === padAddress(this._currentUserAddress);
  }

  // Determine if nuke time should be displayed for this tile
  private shouldShowNukeTime(tile: LandTile): boolean {
    // Always show when zoomed in
    if (!this._isUnzoomed) return true;

    // When unzoomed, only show for lands owned by current user
    return this.isOwnedByCurrentUser(tile);
  }

  // Filtered land tiles that should show nuke times
  get visibleNukeTiles(): LandTile[] {
    return this._landTiles.filter((tile) => {
      if (!BuildingLand.is(tile.land)) return false;
      if (!this.shouldShowNukeTime(tile)) return false;

      // Check if it has neighbors
      try {
        const landWithActions = createLandWithActions(
          tile.land,
          landStore.getAllLands,
        );
        return landWithActions.getNeighbors()?.getBaseLandsArray()?.length > 0;
      } catch {
        return false;
      }
    });
  }

  // Reactive nuke time data calculation using the manager
  get nukeTimeData(): SvelteMap<string, NukeTimeData> {
    return nukeTimeManager.calculateNukeTimeData(
      this.visibleNukeTiles,
      this._landTiles,
    );
  }

  // Getters for display properties
  get isShieldMode(): boolean {
    return this._isShieldMode;
  }

  get isUnzoomed(): boolean {
    return this._isUnzoomed;
  }

  get currentUserAddress(): string | undefined {
    return this._currentUserAddress;
  }

  // Start/stop periodic updates based on visible tiles
  startPeriodicUpdates() {
    if (this.visibleNukeTiles.length > 0) {
      nukeTimeManager.startPeriodicUpdates(
        this.visibleNukeTiles,
        this._landTiles,
      );
    } else {
      nukeTimeManager.stopPeriodicUpdates();
    }
  }

  stopPeriodicUpdates() {
    nukeTimeManager.stopPeriodicUpdates();
  }

  // Cleanup method
  destroy() {
    this.stopPeriodicUpdates();
  }
}

// Create and export singleton instance
export const nukeTimeStore = new NukeTimeStore();
