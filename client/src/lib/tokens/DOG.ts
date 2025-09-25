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
          url: '/tokens/DOG/1-animated.png',
          type: 'rowColumn',
          width: 3,
          height: 4,
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
          url: '/tokens/DOG/2-animated.png',
          type: 'rowColumn',
          width: 3,
          height: 4,
          animations: [{ name: 'idle', frameRange: [0, 9] }],
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
          url: '/tokens/DOG/3-animated.png',
          type: 'rowColumn',
          width: 3,
          height: 4,
          animations: [{ name: 'idle', frameRange: [0, 9] }],
          bottomPadding: 6,
          scale: 0.7,
        },
      ],
    },
  },
} as const;
