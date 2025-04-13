import type { Tile } from '$lib/api/tile-store.svelte';
import { toHexWithPadding } from '$lib/utils';
import data from '$lib/data.json';

export const MAP_SIZE = 16;

function createFakeTiles(): Tile[][] {
  return Array(MAP_SIZE)
    .fill(null)
    .map((_, i) =>
      Array(MAP_SIZE)
        .fill(null)
        .map((_, j) => ({
          location: toHexWithPadding(i * MAP_SIZE + j),
          type: 'grass',
        })),
    );
}

class TileState {
  public tilesStore: Tile[][] = $state(createFakeTiles());

  getTiles() {
    return this.tilesStore;
  }

  addAuction(): void {
    if (this.tilesStore[8] && this.tilesStore[8][8]) {
      this.tilesStore[8][8] = {
        ...this.tilesStore[8][8],
        type: 'auction',
        owner: '0x',
      };
    }
  }

  removeAuction(): void {
    if (this.tilesStore[8] && this.tilesStore[8][8]) {
      this.tilesStore[8][8] = {
        ...this.tilesStore[8][8],
        type: 'grass',
      };
    }
  }

  buyAuction(): void {
    if (this.tilesStore[8] && this.tilesStore[8][8]) {
      this.tilesStore[8][8] = {
        ...this.tilesStore[8][8],
        type: 'house',
        level: 1,
        token: data.availableTokens[0],
      };
    }
  }

  levelUp(x: number, y: number): void {
    if (
      this.tilesStore[x] &&
      this.tilesStore[x][y] &&
      this.tilesStore[x][y].type === 'house' &&
      'level' in this.tilesStore[x][y]
    ) {
      this.tilesStore[x][y] = {
        ...this.tilesStore[x][y],
        level: this.tilesStore[x][y].level + 1,
      };
    }
  }
}

export const tileState = new TileState();

export function tutorialProgression() {
  let value = $state(1);

  return {
    get value() {
      return value;
    },
    increment: () => (value += 1),
    decrement: () => (value -= 1),
  };
}
