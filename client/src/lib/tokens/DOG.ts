export const DOG = {
  skin: 'DOG',
  icon: '/tokens/DOG/dog.png',
  biome: { x: 2, y: 4 },
  building: {
    1: {
      x: 6,
      y: 6,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/DOG/animated-combined.png',
          type: 'rowColumn',
          width: 30,
          height: 1,
          animations: [{ name: 'idle', frameRange: [0, 9] }],
          bottomPadding: 5,
          scale: 0.7,
        },
      ],
    },
    2: {
      x: 6,
      y: 7,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/DOG/animated-combined.png',
          type: 'rowColumn',
          width: 30,
          height: 1,
          animations: [{ name: 'idle', frameRange: [10, 19] }],
          bottomPadding: 7,
          scale: 0.7,
        },
      ],
    },
    3: {
      x: 6,
      y: 8,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/DOG/animated-combined.png',
          type: 'rowColumn',
          width: 30,
          height: 1,
          animations: [{ name: 'idle', frameRange: [20, 29] }],
          bottomPadding: 6,
          scale: 0.7,
        },
      ],
    },
  },
} as const;
