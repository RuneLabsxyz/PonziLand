import { GRID_SIZE } from '$lib/const';
import { locationToCoordinates, toBigInt, toHexWithPadding } from '$lib/utils';
import type { BaseLand } from './land';
import { BuildingLand } from './land/building_land';
import { AuctionLand } from './land/auction_land';
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
        .getNeighbors()
        .filter((l) => l !== undefined);
    }
  }

  public getNeighbors() {
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

  static getLocations(location: bigint, gridSize = GRID_SIZE) {
    const MAP_SIZE = toBigInt(gridSize) ?? -1n;

    return {
      array: [
        location - MAP_SIZE - 1n,
        location - MAP_SIZE,
        location - MAP_SIZE + 1n,
        location - 1n,
        location + 1n,
        location + MAP_SIZE - 1n,
        location + MAP_SIZE,
        location + MAP_SIZE + 1n,
      ],
      up: location - MAP_SIZE,
      down: location + MAP_SIZE,
      left: location - 1n,
      right: location + 1n,
      upLeft: location - MAP_SIZE - 1n,
      upRight: location - MAP_SIZE + 1n,
      downLeft: location + MAP_SIZE - 1n,
      downRight: location + MAP_SIZE + 1n,
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

        if (BuildingLand.is(l) || AuctionLand.is(l)) {
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
      if (BuildingLand.is(l) || AuctionLand.is(l)) {
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
