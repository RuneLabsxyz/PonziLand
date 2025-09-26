export const BONK = {
  skin: 'BONK',
  icon: '/tokens/BONK/bonk.png',
  biome: { x: 3, y: 6 },
  building: {
    1: {
      x: 6,
      y: 18,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/BONK/1-animated-line.png',
          type: 'rowColumn',
          width: 10,
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
          url: '/tokens/BONK/2-animated-line.png',
          type: 'rowColumn',
          width: 10,
          height: 1,
          animations: [{ name: 'idle', frameRange: [0, 9] }],
        },
      ],
    },
    3: {
      x: 6,
      y: 20,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/BONK/3-animated-line.png',
          type: 'rowColumn',
          width: 10,
          height: 1,
          animations: [{ name: 'idle', frameRange: [0, 9] }],
        },
      ],
    },
  },
} as const;
