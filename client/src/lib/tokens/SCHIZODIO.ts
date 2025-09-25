export const SCHIZODIO = {
  skin: 'SCHIZODIO',
  icon: '/tokens/SCHIZODIO/schizodio.png',
  biome: { x: 2, y: 2 },
  building: {
    1: {
      x: 3,
      y: 12,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/SCHIZODIO/1-animated.png',
          type: 'rowColumn',
          width: 3,
          height: 3,
          animations: [{ name: 'idle', frameRange: [0, 6] }],
        },
      ],
    },
    2: {
      x: 3,
      y: 13,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/SCHIZODIO/2-animated.png',
          type: 'rowColumn',
          width: 3,
          height: 3,
          animations: [{ name: 'idle', frameRange: [0, 6] }],
          bottomPadding: 8,
        },
      ],
    },
    3: {
      x: 3,
      y: 14,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/SCHIZODIO/3-animated.png',
          type: 'rowColumn',
          width: 3,
          height: 3,
          animations: [{ name: 'idle', frameRange: [0, 6] }],
        },
      ],
    },
  },
} as const;
