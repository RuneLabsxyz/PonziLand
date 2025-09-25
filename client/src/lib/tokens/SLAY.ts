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
          url: '/tokens/SLAY/1-animated.png',
          type: 'rowColumn',
          width: 3,
          height: 3,
          animations: [{ name: 'idle', frameRange: [0, 6] }],
          bottomPadding: 15,
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
          url: '/tokens/SLAY/2-animated.png',
          type: 'rowColumn',
          width: 3,
          height: 3,
          animations: [{ name: 'idle', frameRange: [0, 6] }],
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
          url: '/tokens/SLAY/3-animated.png',
          type: 'rowColumn',
          width: 3,
          height: 3,
          animations: [{ name: 'idle', frameRange: [0, 6] }],
          bottomPadding: 10,
          scale: 0.8,
        },
      ],
    },
  },
} as const;
