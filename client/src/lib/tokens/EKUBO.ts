export const EKUBO = {
  skin: 'EKUBO',
  icon: '/tokens/EKUBO/ekubo.png',
  biome: { x: 0, y: 1 },
  color: '#6B46C1',
  building: {
    1: {
      x: 0,
      y: 9,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/EKUBO/1-animated-line.png',
          type: 'rowColumn',
          width: 9,
          height: 1,
          animations: [{ name: 'idle', frameRange: [0, 8] }],
          scale: 0.8,
        },
      ],
    },
    2: {
      x: 0,
      y: 10,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/EKUBO/2-animated-line.png',
          type: 'rowColumn',
          width: 8,
          height: 1,
          animations: [{ name: 'idle', frameRange: [0, 7] }],
          bottomPadding: 10,
          scale: 0.8,
        },
      ],
    },
    3: {
      x: 0,
      y: 11,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/EKUBO/3-animated-line.png',
          type: 'rowColumn',
          width: 8,
          height: 1,
          animations: [{ name: 'idle', frameRange: [0, 7] }],
          bottomPadding: 6,
        },
      ],
    },
  },
} as const;
