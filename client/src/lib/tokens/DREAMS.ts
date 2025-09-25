export const DREAMS = {
  skin: 'DREAMS',
  icon: '/tokens/DREAMS/dreams.png',
  biome: { x: 0, y: 5 },
  building: {
    1: {
      x: 6,
      y: 9,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/DREAMS/1-animated.png',
          type: 'rowColumn',
          width: 3,
          height: 4,
          animations: [{ name: 'idle', frameRange: [0, 9] }],
        },
      ],
    },
    2: {
      x: 6,
      y: 10,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/DREAMS/2-animated.png',
          type: 'rowColumn',
          width: 3,
          height: 4,
          animations: [{ name: 'idle', frameRange: [0, 9] }],
        },
      ],
    },
    3: {
      x: 6,
      y: 11,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/DREAMS/3-animated.png',
          type: 'rowColumn',
          width: 3,
          height: 4,
          animations: [{ name: 'idle', frameRange: [0, 9] }],
        },
      ],
    },
  },
} as const;
