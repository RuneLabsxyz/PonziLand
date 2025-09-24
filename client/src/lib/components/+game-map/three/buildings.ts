import type { SpritesheetMetadata } from '@threlte/extras';
import { ALL_TOKENS } from '$lib/tokens';

// Calculate building frame from coordinates (12-column grid)
const getBuildingFrame = (x: number, y: number) => y * 12 + x;

// BUILDING
export const buildingAtlasMeta = [
  {
    url: '/tokens/+global/buildings.png',
    type: 'rowColumn',
    width: 12,
    height: 21,
    animations: [
      // Non-token entries (keep hardcoded)
      { name: 'empty', frameRange: [250, 250] },
      { name: 'empty_1', frameRange: [250, 250] },
      { name: 'empty_2', frameRange: [250, 250] },
      { name: 'empty_3', frameRange: [250, 250] },

      { name: 'auction', frameRange: [250, 250] },
      { name: 'auction_1', frameRange: [250, 250] },
      { name: 'auction_2', frameRange: [250, 250] },
      { name: 'auction_3', frameRange: [250, 250] },

      // Token entries (calculated from token data)
      ...Object.entries(ALL_TOKENS).flatMap(([tokenName, token]) =>
        [1, 2, 3].map((level) => {
          const building = token.building[level as keyof typeof token.building];
          const frame = getBuildingFrame(building.x, building.y);
          return {
            name: `${tokenName}_${level}`,
            frameRange: [frame, frame] as [number, number],
          };
        }),
      ),
    ],
  },

  // --------------------------------------------------------------
  // ANIMATIONS
  // --------------------------------------------------------------

  // STRK

  // {
  //   url: '/tokens/STARKNET/3-animated.png',
  //   type: 'rowColumn',
  //   width: 3,
  //   height: 2,
  //   animations: [{ name: 'STARKNET_3', frameRange: [0, 5] }],
  // },

  // BONK

  {
    url: '/tokens/BONK/1-animated.png',
    type: 'rowColumn',
    width: 3,
    height: 4,
    animations: [{ name: 'BONK_1', frameRange: [0, 9] }],
  },
  {
    url: '/tokens/BONK/2-animated.png',
    type: 'rowColumn',
    width: 3,
    height: 4,
    animations: [{ name: 'BONK_2', frameRange: [0, 9] }],
  },
  {
    url: '/tokens/BONK/3-animated.png',
    type: 'rowColumn',
    width: 3,
    height: 4,
    animations: [{ name: 'BONK_3', frameRange: [0, 9] }],
  },

  // BROTHER

  // BTC

  // {
  //   url: '/tokens/BITCOIN/1-animated.png',
  //   type: 'rowColumn',
  //   width: 3,
  //   height: 4,
  //   animations: [{ name: 'BITCOIN_1', frameRange: [0, 9] }],
  // },
  // {
  //   url: '/tokens/BITCOIN/2-animated.png',
  //   type: 'rowColumn',
  //   width: 3,
  //   height: 4,
  //   animations: [{ name: 'BITCOIN_2', frameRange: [0, 9] }],
  // },
  // {
  //   url: '/tokens/BITCOIN/3-animated.png',
  //   type: 'rowColumn',
  //   width: 3,
  //   height: 4,
  //   animations: [{ name: 'BITCOIN_3', frameRange: [0, 9] }],
  // },

  // DOG

  // {
  //   url: '/tokens/DOG/1-animated.png',
  //   type: 'rowColumn',
  //   width: 3,
  //   height: 4,
  //   animations: [{ name: 'DOG_1', frameRange: [0, 9] }],
  // },
  // {
  //   url: '/tokens/DOG/2-animated.png',
  //   type: 'rowColumn',
  //   width: 3,
  //   height: 4,
  //   animations: [{ name: 'DOG_2', frameRange: [0, 9] }],
  // },
  // {
  //   url: '/tokens/DOG/3-animated.png',
  //   type: 'rowColumn',
  //   width: 3,
  //   height: 4,
  //   animations: [{ name: 'DOG_3', frameRange: [0, 9] }],
  // },

  // SCHIZODIO
  {
    url: '/tokens/SCHIZODIO/1-animated.png',
    type: 'rowColumn',
    width: 3,
    height: 3,
    animations: [{ name: 'SCHIZODIO_1', frameRange: [0, 6] }],
  },
  {
    url: '/tokens/SCHIZODIO/2-animated.png',
    type: 'rowColumn',
    width: 3,
    height: 3,
    animations: [{ name: 'SCHIZODIO_2', frameRange: [0, 6] }],
  },
  {
    url: '/tokens/SCHIZODIO/3-animated.png',
    type: 'rowColumn',
    width: 3,
    height: 3,
    animations: [{ name: 'SCHIZODIO_3', frameRange: [0, 6] }],
  },
] as const satisfies SpritesheetMetadata;
