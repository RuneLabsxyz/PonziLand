export const SISTER = {
  skin: 'SISTER',
  icon: '/tokens/SISTER/sstr.png',
  biome: { x: 3, y: 2 },
  building: {
    1: {
      x: 0,
      y: 12,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/SISTER/1-animated.png',
          type: 'rowColumn',
          width: 3,
          height: 4,
          animations: [{ name: 'idle', frameRange: [0, 9] }],
          bottomPadding: 15,
          scale: 0.8,
        },
      ],
    },
    2: {
      x: 0,
      y: 13,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/SISTER/2-animated.png',
          type: 'rowColumn',
          width: 3,
          height: 4,
          animations: [{ name: 'idle', frameRange: [0, 9] }],
          bottomPadding: 10,
          scale: 0.8,
        },
      ],
    },
    3: {
      x: 0,
      y: 14,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/SISTER/3-animated.png',
          type: 'rowColumn',
          width: 3,
          height: 4,
          animations: [{ name: 'idle', frameRange: [0, 9] }],
          bottomPadding: 10,
          scale: 0.8,
        },
      ],
    },
  },
} as const;
