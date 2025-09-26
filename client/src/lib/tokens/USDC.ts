export const USDC = {
  skin: 'USDC',
  icon: '/tokens/USDC/usdc.png',
  biome: { x: 2, y: 5 },
  building: {
    1: {
      x: 6,
      y: 15,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/USDC/animated-combined.png',
          type: 'rowColumn',
          width: 30,
          height: 1,
          animations: [{ name: 'idle', frameRange: [0, 9] }],
        },
      ],
    },
    2: {
      x: 6,
      y: 16,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/USDC/animated-combined.png',
          type: 'rowColumn',
          width: 30,
          height: 1,
          animations: [{ name: 'idle', frameRange: [10, 19] }],
        },
      ],
    },
    3: {
      x: 6,
      y: 17,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/USDC/animated-combined.png',
          type: 'rowColumn',
          width: 30,
          height: 1,
          animations: [{ name: 'idle', frameRange: [20, 29] }],
        },
      ],
    },
  },
} as const;
