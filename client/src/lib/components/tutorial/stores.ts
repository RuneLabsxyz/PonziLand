import { writable } from 'svelte/store';
import type { Tile } from '$lib/api/tile-store.svelte';
import { toHexWithPadding } from '$lib/utils';
import data from '$lib/data.json';

export const MAP_SIZE = 16;

export function createFakeTiles(): Tile[][] {
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

export function addAuctionToTiles(): void {
  tiles.update((currentTiles) => {
    const newTiles = [...currentTiles];

    if (newTiles[8] && newTiles[8][8]) {
      newTiles[8] = [...newTiles[8]];
      newTiles[8][8] = {
        ...newTiles[8][8],
        type: 'auction',
        owner: '0x',
      };
    }

    return newTiles;
  });
}
export function removeAuctionFromTiles(): void {
  tiles.update((currentTiles) => {
    const newTiles = [...currentTiles];

    if (newTiles[8] && newTiles[8][8]) {
      newTiles[8] = [...newTiles[8]];
      newTiles[8][8] = {
        ...newTiles[8][8],
        type: 'grass',
      };
    }

    return newTiles;
  });
}

export function buyAuction(): void {
  tiles.update((currentTiles) => {
    const newTiles = [...currentTiles];

    if (newTiles[8] && newTiles[8][8]) {
      newTiles[8] = [...newTiles[8]];
      newTiles[8][8] = {
        ...newTiles[8][8],
        type: 'house',
        level: 1,
        token: data.availableTokens[0],
      };
    }

    return newTiles;
  });
}

export function leveUp(x: number, y: number): void {
  tiles.update((currentTiles) => {
    const newTiles = [...currentTiles];

    if (
      newTiles[x] &&
      newTiles[x][y] &&
      newTiles[x][y].type === 'house' &&
      'level' in newTiles[x][y]
    ) {
      newTiles[x] = [...newTiles[x]];
      newTiles[x][y] = {
        ...newTiles[x][y],
        level: newTiles[x][y].level + 1,
      };
    }

    return newTiles;
  });
}

export const tiles = writable<Tile[][]>(createFakeTiles());
export const tutorialProgression = writable<number>(1);
