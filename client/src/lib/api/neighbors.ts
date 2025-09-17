import { GRID_SIZE, COORD_MULTIPLIER } from '$lib/const';
import { locationToCoordinates, toBigInt, toHexWithPadding } from '$lib/utils';
import type { BaseLand } from './land';
import type { LandTileStore } from './land_tiles.svelte';
import { get } from 'svelte/store';

export class Neighbors {
  public MAP_SIZE = GRID_SIZE;
  public location: bigint;
  public locations: {
    array: bigint[];
    up: bigint;
    down: bigint;
    left: bigint;
    right: bigint;
    upLeft: bigint;
    upRight: bigint;
    downLeft: bigint;
    downRight: bigint;
  };
  private source: BaseLand[] = [];
  private neighbors: BaseLand[] = [];

  constructor({
    location,
    neighbors,
    source,
  }: {
    location: string;
    neighbors?: BaseLand[];
    source?: BaseLand[];
  }) {
    this.location = toBigInt(location) ?? -1n;
    this.locations = Neighbors.getLocations(this.location);
    if (neighbors) this.neighbors = neighbors;
    if (source) {
      this.source = source;
      this.neighbors = Neighbors.getWithLocation(location, this.source)
        .getBaseLandsArray()
        .filter((l) => l !== undefined);
    }
  }

  public getBaseLandsArray() {
    return this.neighbors;
  }

  public setNeighbors(neighbors: BaseLand[]) {
    this.neighbors = neighbors;
  }

  public getUpLeft() {
    return this.neighbors.find(
      (l) => l.locationString === toHexWithPadding(this.locations.upLeft),
    );
  }

  public getUp() {
    return this.neighbors.find(
      (l) => l.locationString === toHexWithPadding(this.locations.up),
    );
  }

  public getUpRight() {
    return this.neighbors.find(
      (l) => l.locationString === toHexWithPadding(this.locations.upRight),
    );
  }

  public getLeft() {
    return this.neighbors.find(
      (l) => l.locationString === toHexWithPadding(this.locations.left),
    );
  }

  public getRight() {
    return this.neighbors.find(
      (l) => l.locationString === toHexWithPadding(this.locations.right),
    );
  }

  public getDownLeft() {
    return this.neighbors.find(
      (l) => l.locationString === toHexWithPadding(this.locations.downLeft),
    );
  }

  public getDown() {
    return this.neighbors.find(
      (l) => l.locationString === toHexWithPadding(this.locations.down),
    );
  }

  public getDownRight() {
    return this.neighbors.find(
      (l) => l.locationString === toHexWithPadding(this.locations.downRight),
    );
  }

  static getLocations(location: bigint) {
    // Use bit-based coordinate system matching contracts/src/helpers/coord.cairo
    // location = row * COORD_MULTIPLIER + col, so vertical movement is ±COORD_MULTIPLIER
    const COORD_MULTIPLIER_BIGINT = BigInt(COORD_MULTIPLIER);

    return {
      array: [
        location - COORD_MULTIPLIER_BIGINT - 1n,
        location - COORD_MULTIPLIER_BIGINT,
        location - COORD_MULTIPLIER_BIGINT + 1n,
        location - 1n,
        location + 1n,
        location + COORD_MULTIPLIER_BIGINT - 1n,
        location + COORD_MULTIPLIER_BIGINT,
        location + COORD_MULTIPLIER_BIGINT + 1n,
      ],
      up: location - COORD_MULTIPLIER_BIGINT,
      down: location + COORD_MULTIPLIER_BIGINT,
      left: location - 1n,
      right: location + 1n,
      upLeft: location - COORD_MULTIPLIER_BIGINT - 1n,
      upRight: location - COORD_MULTIPLIER_BIGINT + 1n,
      downLeft: location + COORD_MULTIPLIER_BIGINT - 1n,
      downRight: location + COORD_MULTIPLIER_BIGINT + 1n,
    };
  }

  static getWithStoreAndLocation(
    locationString: string,
    tileStore: LandTileStore,
  ) {
    const location = toBigInt(locationString) ?? 0n;

    const locations = this.getLocations(location).array;
    const neighborsLands = locations
      .map((l) => {
        const coordiates = locationToCoordinates(Number(l));
        const store = tileStore.getLand(coordiates.x, coordiates.y);

        if (!store) return;

        return get(store);
      })
      .filter((l) => {
        if (l === undefined) return false;

        if (['building', 'auction'].includes(l.type)) {
          return l.owner !== toHexWithPadding(0);
        }
        return false;
      });

    return new Neighbors({
      location: locationString,
      neighbors: neighborsLands.filter((l) => l !== undefined),
    });
  }

  static getWithLocation(locationString: string, landStore: BaseLand[]) {
    const location = toBigInt(locationString) ?? 0n;

    const locations = this.getLocations(location).array;
    const filteredStore = landStore.filter((l) => {
      if (['building', 'auction'].includes(l.type)) {
        return l.owner !== toHexWithPadding(0);
      }
      return false;
    });

    const neighborsLands = locations.map((l) =>
      filteredStore.find((ls) => ls.locationString === toHexWithPadding(l)),
    );

    return new Neighbors({
      location: locationString,
      neighbors: neighborsLands.filter((l) => l !== undefined),
    });
  }
}
