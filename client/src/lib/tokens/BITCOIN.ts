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
          url: '/tokens/BITCOIN/animated-combined.png',
          type: 'rowColumn',
          width: 30,
          height: 1,
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
          url: '/tokens/BITCOIN/animated-combined.png',
          type: 'rowColumn',
          width: 30,
          height: 1,
          animations: [{ name: 'idle', frameRange: [10, 19] }],
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
          url: '/tokens/BITCOIN/animated-combined.png',
          type: 'rowColumn',
          width: 30,
          height: 1,
          animations: [{ name: 'idle', frameRange: [20, 29] }],
          bottomPadding: 10,
          scale: 0.8,
        },
      ],
    },
  },
} as const;
