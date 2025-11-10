export const SISTER = {
  skin: 'SISTER',
  icon: '/tokens/SISTER/sstr.png',
  biome: { x: 3, y: 2 },
  color: '#B46A8D',
  building: {
    1: {
      x: 0,
      y: 12,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/SISTER/1-animated-line.png',
          type: 'rowColumn',
          width: 10,
          height: 1,
          animations: [{ name: 'idle', frameRange: [0, 9] }],
          bottomPadding: 12,
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
          url: '/tokens/SISTER/2-animated-line.png',
          type: 'rowColumn',
          width: 10,
          height: 1,
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
          url: '/tokens/SISTER/3-animated-line.png',
          type: 'rowColumn',
          width: 10,
          height: 1,
          animations: [{ name: 'idle', frameRange: [0, 9] }],
          bottomPadding: 4,
          scale: 1,
        },
      ],
    },
  },
} as const;
