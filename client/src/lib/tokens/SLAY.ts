export const SLAY = {
  skin: 'SLAY',
  icon: '/tokens/SLAY/slay.png',
  biome: { x: 0, y: 3 },
  building: {
    1: {
      x: 0,
      y: 6,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/SLAY/animated-combined.png',
          type: 'rowColumn',
          width: 21,
          height: 1,
          animations: [{ name: 'idle', frameRange: [0, 6] }],
          bottomPadding: 8,
          scale: 0.8,
        },
      ],
    },
    2: {
      x: 0,
      y: 7,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/SLAY/animated-combined.png',
          type: 'rowColumn',
          width: 21,
          height: 1,
          animations: [{ name: 'idle', frameRange: [7, 13] }],
          bottomPadding: 10,
          scale: 0.8,
        },
      ],
    },
    3: {
      x: 0,
      y: 8,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/SLAY/animated-combined.png',
          type: 'rowColumn',
          width: 21,
          height: 1,
          animations: [{ name: 'idle', frameRange: [14, 20] }],
          bottomPadding: 10,
          scale: 0.8,
        },
      ],
    },
  },
} as const;
