export const STARKNET = {
  skin: 'STARKNET',
  icon: '/tokens/STARKNET/strk.png',
  biome: { x: 2, y: 3 },
  building: {
    1: {
      x: 3,
      y: 3,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/STARKNET/animated-combined.png',
          type: 'rowColumn',
          width: 18,
          height: 1,
          animations: [{ name: 'idle', frameRange: [0, 5] }],
          bottomPadding: 12,
          scale: 0.8,
        },
      ],
    },
    2: {
      x: 3,
      y: 4,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/STARKNET/animated-combined.png',
          type: 'rowColumn',
          width: 18,
          height: 1,
          animations: [{ name: 'idle', frameRange: [6, 11] }],
          bottomPadding: 10,
          scale: 0.8,
        },
      ],
    },
    3: {
      x: 3,
      y: 5,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/STARKNET/animated-combined.png',
          type: 'rowColumn',
          width: 18,
          height: 1,
          animations: [{ name: 'idle', frameRange: [12, 17] }],
          bottomPadding: 10,
          scale: 0.8,
        },
      ],
    },
  },
} as const;
