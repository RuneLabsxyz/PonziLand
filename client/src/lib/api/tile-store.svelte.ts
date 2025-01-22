import { derived, type Readable } from 'svelte/store';
import { useLands, type LandWithActions } from './land.svelte';
import { ensureNumber, toHexWithPadding } from '$lib/utils';

export const MAP_SIZE = 64;

export type EmptyTile = {
  location: string;
  type: 'grass';
};

export type LandTile = LandWithActions & {
  type: 'house' | 'auction';
};

export type Tile = EmptyTile | LandTile;

export function useTiles(): Readable<Tile[][]> | undefined {
  const landStore = useLands();

  if (landStore == undefined) {
    return;
  }

  return derived([landStore], ([lands]) => {
    const tiles: Tile[][] = Array(MAP_SIZE)
      .fill(null)
      .map((_, i) =>
        Array(MAP_SIZE)
          .fill(null)
          .map((_, j) => ({
            location: toHexWithPadding(i * MAP_SIZE + j),
            type: 'grass',
          })),
      );

    for (const land of lands) {
      const location = ensureNumber(land.location);

      const x = location % MAP_SIZE;
      const y = Math.floor(location / MAP_SIZE);

      const type = land.owner == toHexWithPadding(0) ? 'auction' : 'house';

      tiles[y][x] = {
        ...land,
        type,
      };
    }

    return tiles;
  });
}
