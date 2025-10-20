export const SURVIVOR = {
  skin: 'SURVIVOR',
  icon: '/tokens/SURVIVOR/survivor.png',
  biome: { x: 2, y: 6 },
  building: {
    1: {
      x: 9,
      y: 6,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/SURVIVOR/1-animated-line.png',
          type: 'rowColumn',
          width: 10,
          height: 1,
          animations: [{ name: 'idle', frameRange: [0, 9] }],
          scale: 0.75,
          bottomPadding: 4,
        },
      ],
    },
    2: {
      x: 9,
      y: 7,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/SURVIVOR/2-animated-line.png',
          type: 'rowColumn',
          width: 10,
          height: 1,
          animations: [{ name: 'idle', frameRange: [0, 9] }],
          bottomPadding: 4,
        },
      ],
    },
    3: {
      x: 9,
      y: 8,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/SURVIVOR/3-animated-line.png',
          type: 'rowColumn',
          width: 10,
          height: 1,
          animations: [{ name: 'idle', frameRange: [0, 9] }],
          bottomPadding: 6,
        },
      ],
    },
  },
} as const;
