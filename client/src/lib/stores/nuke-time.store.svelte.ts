import { BuildingLand } from '$lib/api/land/building_land';
import { landStore } from '$lib/stores/store.svelte';
import { padAddress, parseLocation } from '$lib/utils';
import { createLandWithActions } from '$lib/utils/land-actions';
import { LandTile } from '$lib/components/+game-map/three/landTile';
import {
  nukeTimeManager,
  type NukeTimeData,
} from '$lib/components/+game-map/three/utils/nuke-time-manager.svelte';
import { SvelteMap } from 'svelte/reactivity';
import { get } from 'svelte/store';

class NukeTimeStore {
  private _locationStrings = $state<string[]>([]);
  private _isShieldMode = $state(false);
  private _isUnzoomed = $state(false);
  private _currentUserAddress = $state<string | undefined>(undefined);

  constructor() {
    // Initialize store
  }

  // Setters for external data
  setLocationStrings(locations: string[]) {
    this._locationStrings = locations;
  }

  setDisplayMode(isShieldMode: boolean, isUnzoomed: boolean) {
    this._isShieldMode = isShieldMode;
    this._isUnzoomed = isUnzoomed;
  }

  setCurrentUserAddress(address: string | undefined) {
    this._currentUserAddress = address;
  }

  // Create LandTiles from location strings
  private createLandTilesFromLocations(): LandTile[] {
    return this._locationStrings
      .map((locationString) => {
        try {
          const coordinates = parseLocation(locationString);
          const baseLand = landStore.getLand(coordinates[0], coordinates[1]);
          if (!baseLand) return null;

          const land = get(baseLand);
          if (!BuildingLand.is(land)) return null;

          const position: [number, number, number] = [
            coordinates[0],
            0.1,
            coordinates[1],
          ];

          // Create a proper LandTile object
          return new LandTile(
            position,
            land.token?.name || 'empty',
            land.token?.name || 'empty',
            land.level,
            land,
          );
        } catch {
          return null;
        }
      })
      .filter((tile): tile is LandTile => tile !== null);
  }

  // Reactive nuke time data calculation using the manager
  get nukeTimeData(): SvelteMap<string, NukeTimeData> {
    const landTiles = this.createLandTilesFromLocations();
    return nukeTimeManager.calculateNukeTimeData(landTiles, landTiles);
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
    const landTiles = this.createLandTilesFromLocations();
    if (landTiles.length > 0) {
      nukeTimeManager.startPeriodicUpdates(landTiles, landTiles);
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
