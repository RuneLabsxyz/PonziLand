export const DREAMS = {
  skin: 'DREAMS',
  icon: '/tokens/DREAMS/dreams.png',
  biome: { x: 0, y: 5 },
  color: '#3A306E',
  building: {
    1: {
      x: 6,
      y: 9,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/DREAMS/animated-combined.png',
          type: 'rowColumn',
          width: 30,
          height: 1,
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
          url: '/tokens/DREAMS/animated-combined.png',
          type: 'rowColumn',
          width: 30,
          height: 1,
          animations: [{ name: 'idle', frameRange: [10, 19] }],
        },
      ],
    },
    3: {
      x: 6,
      y: 11,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/DREAMS/animated-combined.png',
          type: 'rowColumn',
          width: 30,
          height: 1,
          animations: [{ name: 'idle', frameRange: [20, 29] }],
        },
      ],
    },
  },
} as const;
