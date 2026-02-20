import {
  GRID_SIZE,
  COORD_MULTIPLIER,
  COORD_MASK,
  MAX_GRID_SIZE,
} from '$lib/const';
import { locationToCoordinates, toBigInt, toHexWithPadding } from '$lib/utils';
import type { BaseLand } from './land';
import type { LandTileStore } from './land_tiles.svelte';
import { get } from 'svelte/store';

/**
 * Calculate the maximum number of geometric neighbors for a land at the given location.
 * Matches contracts/src/helpers/coord.cairo::max_neighbors exactly.
 *
 * - Corner lands (e.g. 0,0): 3 neighbors
 * - Edge lands (e.g. 0,1): 5 neighbors
 * - Interior lands: 8 neighbors
 */
export function maxNeighbors(location: number): number {
  const row = Math.floor(location / COORD_MULTIPLIER);
  const col = location & COORD_MASK;

  let count = 0;

  // left: col > 0
  if (col > 0) count++;
  // right: col < MAX_GRID_SIZE
  if (col < MAX_GRID_SIZE) count++;
  // up: row > 0
  if (row > 0) count++;
  // down: row < MAX_GRID_SIZE
  if (row < MAX_GRID_SIZE) count++;
  // up-left: row > 0 && col > 0
  if (row > 0 && col > 0) count++;
  // up-right: row > 0 && col < MAX_GRID_SIZE
  if (row > 0 && col < MAX_GRID_SIZE) count++;
  // down-left: row < MAX_GRID_SIZE && col > 0
  if (row < MAX_GRID_SIZE && col > 0) count++;
  // down-right: row < MAX_GRID_SIZE && col < MAX_GRID_SIZE
  if (row < MAX_GRID_SIZE && col < MAX_GRID_SIZE) count++;

  return count;
}

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

  /**
   * Calculate all neighbor locations for a given position.
   * Matches contracts/src/helpers/coord.cairo::get_all_neighbors —
   * the `array` only contains valid (in-bounds) locations,
   * while the named direction properties are always present
   * (used for positional UI grid rendering).
   */
  static getLocations(location: bigint) {
    const COORD_MULTIPLIER_BIGINT = BigInt(COORD_MULTIPLIER);
    const row = Number(location / COORD_MULTIPLIER_BIGINT);
    const col = Number(location & BigInt(COORD_MASK));

    const upLeft = location - COORD_MULTIPLIER_BIGINT - 1n;
    const up = location - COORD_MULTIPLIER_BIGINT;
    const upRight = location - COORD_MULTIPLIER_BIGINT + 1n;
    const left = location - 1n;
    const right = location + 1n;
    const downLeft = location + COORD_MULTIPLIER_BIGINT - 1n;
    const down = location + COORD_MULTIPLIER_BIGINT;
    const downRight = location + COORD_MULTIPLIER_BIGINT + 1n;

    // Build array with only valid (in-bounds) neighbors,
    // matching get_all_neighbors in the Cairo contract
    const array: bigint[] = [];
    if (col > 0) array.push(left);
    if (col < MAX_GRID_SIZE) array.push(right);
    if (row > 0) array.push(up);
    if (row < MAX_GRID_SIZE) array.push(down);
    if (row > 0 && col > 0) array.push(upLeft);
    if (row > 0 && col < MAX_GRID_SIZE) array.push(upRight);
    if (row < MAX_GRID_SIZE && col > 0) array.push(downLeft);
    if (row < MAX_GRID_SIZE && col < MAX_GRID_SIZE) array.push(downRight);

    return {
      array,
      up,
      down,
      left,
      right,
      upLeft,
      upRight,
      downLeft,
      downRight,
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
