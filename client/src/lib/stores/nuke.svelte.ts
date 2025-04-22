export let nukeStore = $state<{
  pending: { [location: string]: boolean };
  nuking: { [location: string]: boolean };
}>({
  pending: {},
  nuking: {},
});

import type { Tile } from '$lib/api/tile-store.svelte';
class LocationsToNuke {
  public locations: { location: string; nukable: boolean }[] = $state([]);

  getLocations() {
    return this.locations;
  }
  getNukableLocations() {
    return this.locations.filter((location) => location.nukable);
  }

  callNukableLocation = async (land: Tile): Promise<boolean> => {
    if (!land || !('getNextClaim' in land)) {
      return false;
    }

    const timeToNuke = await land.getNukable();
    if (timeToNuke == 0n) {
      return true;
    } else {
      return false;
    }
    return false;
  };

  checkIfNukable(location: string) {
    console;
    const foundLocation = this.locations.find(
      (loc) => loc.location === location,
    );
    if (foundLocation && foundLocation.nukable) {
      return true;
    }
    return false;
  }
  setLocations(locations: { location: string; nukable: boolean }[]) {
    this.locations = locations;
  }

  addLocation(location: string, nukable: boolean) {
    this.locations.push({ location, nukable });
  }
}

export const locationsToNuke = new LocationsToNuke();
