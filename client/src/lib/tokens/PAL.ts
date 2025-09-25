export const PAL = {
  skin: 'PAL',
  icon: '/tokens/PAL/pal.png',
  biome: { x: 1, y: 2 },
  building: {
    1: {
      x: 0,
      y: 3,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/PAL/1-animated.png',
          type: 'rowColumn',
          width: 3,
          height: 3,
          animations: [{ name: 'idle', frameRange: [0, 8] }],
          bottomPadding: 15,
          scale: 0.8,
        },
      ],
    },
    2: {
      x: 0,
      y: 4,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/PAL/2-animated.png',
          type: 'rowColumn',
          width: 3,
          height: 3,
          animations: [{ name: 'idle', frameRange: [0, 8] }],
          bottomPadding: 10,
          scale: 0.8,
        },
      ],
    },
    3: {
      x: 0,
      y: 5,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/PAL/3-animated.png',
          type: 'rowColumn',
          width: 3,
          height: 3,
          animations: [{ name: 'idle', frameRange: [0, 8] }],
          bottomPadding: 10,
          scale: 0.8,
        },
      ],
    },
  },
} as const;
