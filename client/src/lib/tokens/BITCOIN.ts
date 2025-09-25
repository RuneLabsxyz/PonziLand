export const BITCOIN = {
  skin: 'BITCOIN',
  icon: '/tokens/BITCOIN/wbtc.png',
  biome: { x: 2, y: 0 },
  building: {
    1: {
      x: 0,
      y: 18,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/BITCOIN/1-animated.png',
          type: 'rowColumn',
          width: 3,
          height: 4,
          animations: [{ name: 'idle', frameRange: [0, 9] }],
          bottomPadding: 15,
          scale: 0.8,
        },
      ],
    },
    2: {
      x: 0,
      y: 19,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/BITCOIN/2-animated.png',
          type: 'rowColumn',
          width: 3,
          height: 4,
          animations: [{ name: 'idle', frameRange: [0, 9] }],
          bottomPadding: 10,
          scale: 0.8,
        },
      ],
    },
    3: {
      x: 0,
      y: 20,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/BITCOIN/3-animated.png',
          type: 'rowColumn',
          width: 3,
          height: 4,
          animations: [{ name: 'idle', frameRange: [0, 9] }],
          bottomPadding: 10,
          scale: 0.8,
        },
      ],
    },
  },
} as const;
