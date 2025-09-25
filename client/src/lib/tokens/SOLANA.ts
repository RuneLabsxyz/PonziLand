export const SOLANA = {
  skin: 'SOLANA',
  icon: '/tokens/SOLANA/sol.png',
  biome: { x: 3, y: 5 },
  building: {
    1: {
      x: 6,
      y: 12,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/SOLANA/1-animated.png',
          type: 'rowColumn',
          width: 3,
          height: 4,
          animations: [{ name: 'idle', frameRange: [0, 9] }],
          bottomPadding: 8,
          scale: 0.8,
        },
      ],
    },
    2: {
      x: 6,
      y: 13,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/SOLANA/2-animated.png',
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
      x: 6,
      y: 14,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/SOLANA/3-animated.png',
          type: 'rowColumn',
          width: 3,
          height: 4,
          animations: [{ name: 'idle', frameRange: [0, 9] }],
          bottomPadding: 6,
          scale: 1,
        },
      ],
    },
  },
} as const;
