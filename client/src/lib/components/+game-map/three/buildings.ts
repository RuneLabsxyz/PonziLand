import type { SpritesheetMetadata } from '@threlte/extras';

// BUILDING
export const buildingAtlasMeta = [
  {
    url: '/tokens/+global/buildings.png',
    type: 'rowColumn',
    width: 12,
    height: 21,
    animations: [
      { name: 'empty', frameRange: [250, 250] },
      { name: 'empty_1', frameRange: [250, 250] },
      { name: 'empty_2', frameRange: [250, 250] },
      { name: 'empty_3', frameRange: [250, 250] },

      { name: 'auction', frameRange: [250, 250] },
      { name: 'auction_1', frameRange: [250, 250] },
      { name: 'auction_2', frameRange: [250, 250] },
      { name: 'auction_3', frameRange: [250, 250] },

      { name: 'LORDS_1', frameRange: [0, 0] },
      { name: 'LORDS_2', frameRange: [12, 12] },
      { name: 'LORDS_3', frameRange: [24, 24] },

      { name: 'PAL_1', frameRange: [36, 36] },
      { name: 'PAL_2', frameRange: [48, 48] },
      { name: 'PAL_3', frameRange: [60, 60] },

      { name: 'SLAY_1', frameRange: [72, 72] },
      { name: 'SLAY_2', frameRange: [84, 84] },
      { name: 'SLAY_3', frameRange: [96, 96] },

      { name: 'EKUBO_1', frameRange: [108, 108] },
      { name: 'EKUBO_2', frameRange: [120, 120] },
      { name: 'EKUBO_3', frameRange: [132, 132] },

      { name: 'SISTERS_1', frameRange: [144, 144] },
      { name: 'SISTERS_2', frameRange: [156, 156] },
      { name: 'SISTERS_3', frameRange: [168, 168] },

      { name: 'SLINKY_1', frameRange: [180, 180] },
      { name: 'SLINKY_2', frameRange: [192, 192] },
      { name: 'SLINKY_3', frameRange: [204, 204] },

      { name: 'BITCOIN_1', frameRange: [216, 216] },
      { name: 'BITCOIN_2', frameRange: [228, 228] },
      { name: 'BITCOIN_3', frameRange: [240, 240] },

      { name: 'PAPER_1', frameRange: [3, 3] },
      { name: 'PAPER_2', frameRange: [15, 15] },
      { name: 'PAPER_3', frameRange: [27, 27] },

      { name: 'STARKNET_1', frameRange: [39, 39] },
      { name: 'STARKNET_2', frameRange: [51, 51] },
      { name: 'STARKNET_3', frameRange: [63, 63] },

      { name: 'BROTHER_1', frameRange: [75, 75] },
      { name: 'BROTHER_2', frameRange: [87, 87] },
      { name: 'BROTHER_3', frameRange: [99, 99] },

      { name: 'ETHEREUM_1', frameRange: [111, 111] },
      { name: 'ETHEREUM_2', frameRange: [123, 123] },
      { name: 'ETHEREUM_3', frameRange: [135, 135] },

      // { name: 'SCHIZODIO_1', frameRange: [147, 147] },
      // { name: 'SCHIZODIO_2', frameRange: [159, 159] },
      // { name: 'SCHIZODIO_3', frameRange: [171, 171] },

      { name: 'NUMS_1', frameRange: [183, 183] },
      { name: 'NUMS_2', frameRange: [195, 195] },
      { name: 'NUMS_3', frameRange: [207, 207] },

      { name: 'FLIP_1', frameRange: [219, 219] },
      { name: 'FLIP_2', frameRange: [231, 231] },
      { name: 'FLIP_3', frameRange: [243, 243] },

      { name: 'WNT_1', frameRange: [6, 6] },
      { name: 'WNT_2', frameRange: [18, 18] },
      { name: 'WNT_3', frameRange: [30, 30] },

      { name: 'QQ_1', frameRange: [42, 42] },
      { name: 'QQ_2', frameRange: [54, 54] },
      { name: 'QQ_3', frameRange: [66, 66] },

      { name: 'DOG_1', frameRange: [78, 78] },
      { name: 'DOG_2', frameRange: [90, 90] },
      { name: 'DOG_3', frameRange: [102, 102] },

      { name: 'DREAMS_1', frameRange: [114, 114] },
      { name: 'DREAMS_2', frameRange: [126, 126] },
      { name: 'DREAMS_3', frameRange: [138, 138] },

      { name: 'SOLANA_1', frameRange: [132, 132] },
      { name: 'SOLANA_2', frameRange: [144, 144] },
      { name: 'SOLANA_3', frameRange: [156, 156] },

      { name: 'USDC_1', frameRange: [186, 186] },
      { name: 'USDC_2', frameRange: [198, 198] },
      { name: 'USDC_3', frameRange: [210, 210] },

      // { name: 'BONK_1', frameRange: [222, 222] },
      // { name: 'BONK_2', frameRange: [234, 234] },
      // { name: 'BONK_3', frameRange: [246, 246] },

      { name: 'EVERAI_1', frameRange: [9, 9] },
      { name: 'EVERAI_2', frameRange: [21, 21] },
      { name: 'EVERAI_3', frameRange: [33, 33] },

      { name: 'BURR_1', frameRange: [45, 45] },
      { name: 'BURR_2', frameRange: [57, 57] },
      { name: 'BURR_3', frameRange: [69, 69] },
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
