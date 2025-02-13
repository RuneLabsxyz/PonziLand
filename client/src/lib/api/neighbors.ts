import { GRID_SIZE } from '$lib/const';
import { toBigInt, toHexWithPadding } from '$lib/utils';
import type { LandWithActions } from './land.svelte';

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
  private source: LandWithActions[] = [];
  private neighbors: LandWithActions[] = [];

  constructor({
    location,
    neighbors,
    source,
  }: {
    location: string;
    neighbors?: LandWithActions[];
    source?: LandWithActions[];
  }) {
    this.location = toBigInt(location) ?? -1n;
    this.locations = Neighbors.getLocations(this.location);
    if (neighbors) this.neighbors = neighbors;
    if (source) {
      this.source = source;
      this.neighbors = Neighbors.getWithLocation(location, this.source).filter(
        (l) => l !== undefined,
      );
    }
  }

  public getNeighbors() {
    return this.neighbors;
  }

  public setNeighbors(neighbors: LandWithActions[]) {
    this.neighbors = neighbors;
  }

  public getUpLeft() {
    return this.neighbors.find(
      (l) => l.location === toHexWithPadding(this.locations.upLeft),
    );
  }

  public getUp() {
    return this.neighbors.find(
      (l) => l.location === toHexWithPadding(this.locations.up),
    );
  }

  public getUpRight() {
    return this.neighbors.find(
      (l) => l.location === toHexWithPadding(this.locations.upRight),
    );
  }

  public getLeft() {
    return this.neighbors.find(
      (l) => l.location === toHexWithPadding(this.locations.left),
    );
  }

  public getRight() {
    return this.neighbors.find(
      (l) => l.location === toHexWithPadding(this.locations.right),
    );
  }

  public getDownLeft() {
    return this.neighbors.find(
      (l) => l.location === toHexWithPadding(this.locations.downLeft),
    );
  }

  public getDown() {
    return this.neighbors.find(
      (l) => l.location === toHexWithPadding(this.locations.down),
    );
  }

  public getDownRight() {
    return this.neighbors.find(
      (l) => l.location === toHexWithPadding(this.locations.downRight),
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

  static getWithLocation(locationString: string, landStore: LandWithActions[]) {
    const location = toBigInt(locationString) ?? 0n;
    const neighbors = this.getLocations(location).array;

    const neighborsHex = neighbors.map((loc) => toHexWithPadding(loc));

    const filteredStore = landStore.filter(
      (l) => l.owner !== toHexWithPadding(0),
    );

    const neighbours = neighborsHex.map((loc) => {
      return filteredStore.find((l) => {
        return l.location == loc;
      });
    });

    return neighbours;
  }
}
