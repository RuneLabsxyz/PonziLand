import { writable } from 'svelte/store';
import type { Tile } from '$lib/api/tile-store.svelte';
import { toHexWithPadding } from '$lib/utils';
import { selectedLand } from '$lib/stores/stores.svelte';
const MAP_SIZE = 16;

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
        token: {
          name: 'Emulated STRK',
          symbol: 'eSTRK',
          address:
            '0x071de745c1ae996cfd39fb292b4342b7c086622e3ecf3a5692bd623060ff3fa0',
          liquidityPoolType: '005-01',
          decimals: 18,
          images: {
            icon: '/tokens/eSTRK/icon.png',
            biome: {
              x: 0,
              y: 7,
            },
            building: {
              '1': {
                x: 3,
                y: 3,
              },
              '2': {
                x: 3,
                y: 4,
              },
              '3': {
                x: 3,
                y: 5,
                frames: 6,
                ySize: 192,
                xSize: 192,
                xMax: 1152,
                yMax: 192,
              },
            },
          },
        },
      };
    }

    return newTiles;
  });
}

export function setSelectedlandAsTheAuctionLand(): void {}

export const tiles = writable<Tile[][]>(createFakeTiles());
export const tutorialProgression = writable<number>(1);
