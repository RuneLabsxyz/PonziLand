import type { Tile } from '$lib/api/tile-store.svelte';
import {
  ClauseBuilder,
  ToriiQueryBuilder,
  type SchemaType,
} from '@dojoengine/sdk';
import { useDojo } from '$lib/contexts/dojo';
import { NAME_SPACE } from '$lib/const';
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

function getNukeQuery() {
  const keys: `${string}-${string}`[] = [];
  keys.push(`${NAME_SPACE}-LandNukedEvent`);
  const clauses = new ClauseBuilder().keys(keys, []);
  return new ToriiQueryBuilder<SchemaType>()
    .withClause(clauses.build())
    .includeHashedKeys();
}

export async function getNukeData() {
  const { client: sdk } = useDojo();

  const query = getNukeQuery();
  const nukeData = await sdk.subscribeEventQuery({
    query,
    callback: (response) => {
      if (response.error || response.data == null) {
        console.log('Got an error!', response.error);
      } else {
        console.log('Data of all the nukes', response.data);
        return response.data;
      }
    },
  });
  return nukeData;
}
