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
          url: '/tokens/STARKNET/1-animated.png',
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
      x: 3,
      y: 4,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/STARKNET/2-animated.png',
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
      x: 3,
      y: 5,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/STARKNET/3-animated.png',
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
