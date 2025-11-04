export const BONK = {
  skin: 'BONK',
  icon: '/tokens/BONK/bonk.png',
  color: '#F97316', // Orange for BONK
  biome: { x: 3, y: 6 },
  building: {
    1: {
      x: 6,
      y: 18,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/BONK/animated-combined.png',
          type: 'rowColumn',
          width: 30,
          height: 1,
          animations: [{ name: 'idle', frameRange: [0, 9] }],
        },
      ],
    },
    2: {
      x: 6,
      y: 19,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/BONK/animated-combined.png',
          type: 'rowColumn',
          width: 30,
          height: 1,
          animations: [{ name: 'idle', frameRange: [10, 19] }],
        },
      ],
    },
    3: {
      x: 6,
      y: 20,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/BONK/animated-combined.png',
          type: 'rowColumn',
          width: 30,
          height: 1,
          animations: [{ name: 'idle', frameRange: [20, 29] }],
        },
      ],
    },
  },
} as const;
