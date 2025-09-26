export const ETHEREUM = {
  skin: 'ETHEREUM',
  icon: '/tokens/ETHEREUM/eth.png',
  biome: { x: 1, y: 1 },
  building: {
    1: {
      x: 3,
      y: 9,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/ETHEREUM/1-animated-line.png',
          type: 'rowColumn',
          width: 10,
          height: 1,
          animations: [{ name: 'idle', frameRange: [0, 9] }],
          bottomPadding: 10,
          scale: 0.8,
        },
      ],
    },
    2: {
      x: 3,
      y: 10,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/ETHEREUM/2-animated-line.png',
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
      x: 3,
      y: 11,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/ETHEREUM/3-animated-line.png',
          type: 'rowColumn',
          width: 10,
          height: 1,
          animations: [{ name: 'idle', frameRange: [0, 9] }],
          bottomPadding: 8,
          scale: 1,
        },
      ],
    },
  },
} as const;
