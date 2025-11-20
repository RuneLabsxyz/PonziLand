export const USDC = {
  skin: 'USDC',
  icon: '/tokens/USDC/usdc.png',
  color: '#2775CA', // USDC blue
  biome: { x: 2, y: 5 },
  building: {
    1: {
      x: 6,
      y: 15,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/USDC/1-animated-line.png',
          type: 'rowColumn',
          width: 10,
          height: 1,
          animations: [{ name: 'idle', frameRange: [0, 9] }],
          bottomPadding: 16,
          scale: 0.75,
        },
      ],
    },
    2: {
      x: 6,
      y: 16,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/USDC/2-animated-line.png',
          type: 'rowColumn',
          width: 10,
          height: 1,
          animations: [{ name: 'idle', frameRange: [0, 9] }],
          bottomPadding: 12,
          scale: 0.75,
        },
      ],
    },
    3: {
      x: 6,
      y: 17,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/USDC/3-animated-line.png',
          type: 'rowColumn',
          width: 10,
          height: 1,
          animations: [{ name: 'idle', frameRange: [0, 9] }],
          bottomPadding: 14,
        },
      ],
    },
  },
} as const;
