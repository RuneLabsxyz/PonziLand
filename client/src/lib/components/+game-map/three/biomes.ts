import type { SpritesheetMetadata } from '@threlte/extras';
import { ALL_TOKENS } from '$lib/tokens';

// Calculate biome frame from coordinates (4-column grid)
const getBiomeFrame = (x: number, y: number) => y * 4 + x;

export const biomeAtlasMeta = [
  {
    url: '/land-display/empty.png',
    type: 'rowColumn',
    width: 4,
    height: 3,
    animations: [
      { name: 'empty', frameRange: [0, 0] },
      { name: 'default', frameRange: [0, 0] },
      { name: 'empty-outline', frameRange: [0, 0] },
      { name: 'default-outline', frameRange: [0, 0] },
      { name: 'empty_0', frameRange: [0, 0] },
      { name: 'empty_1', frameRange: [1, 1] },
      { name: 'empty_2', frameRange: [2, 2] },
      { name: 'empty_3', frameRange: [3, 3] },
      { name: 'empty_4', frameRange: [4, 4] },
      { name: 'empty_5', frameRange: [5, 5] },
      { name: 'empty_6', frameRange: [6, 6] },
      { name: 'empty_7', frameRange: [7, 7] },
      { name: 'empty_8', frameRange: [8, 8] },
      { name: 'empty_9', frameRange: [9, 9] },
      { name: 'empty_10', frameRange: [10, 10] },
      { name: 'auction_shadow', frameRange: [11, 11] },
    ],
  },
  {
    url: '/tokens/+global/biomes.png',
    type: 'rowColumn',
    width: 4,
    height: 7,
    animations: [
      // Non-token entries (keep hardcoded)
      { name: 'auction', frameRange: [1, 1] },

      // Token entries (calculated from token data)
      ...Object.entries(ALL_TOKENS).map(([name, token]) => {
        const frame = getBiomeFrame(token.biome.x, token.biome.y);
        return {
          name,
          frameRange: [frame, frame] as [number, number],
        };
      }),
    ],
  },
] as const satisfies SpritesheetMetadata;
