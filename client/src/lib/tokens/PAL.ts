export const PAL = {
  skin: 'PAL',
  icon: '/tokens/PAL/pal.png',
  biome: { x: 1, y: 2 },
  color: '#C78957',
  building: {
    1: {
      x: 0,
      y: 3,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/PAL/animated-combined.png',
          type: 'rowColumn',
          width: 27,
          height: 1,
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
          url: '/tokens/PAL/animated-combined.png',
          type: 'rowColumn',
          width: 27,
          height: 1,
          animations: [{ name: 'idle', frameRange: [9, 17] }],
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
          url: '/tokens/PAL/animated-combined.png',
          type: 'rowColumn',
          width: 27,
          height: 1,
          animations: [{ name: 'idle', frameRange: [18, 26] }],
          bottomPadding: 10,
          scale: 0.8,
        },
      ],
    },
  },
} as const;
