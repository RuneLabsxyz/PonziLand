import { scale } from 'svelte/transition';

export const BROTHER = {
  skin: 'BROTHER',
  icon: '/tokens/BROTHER/brother.png',
  biome: { x: 1, y: 3 },
  building: {
    1: {
      x: 3,
      y: 6,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/BROTHER/animated-combined.png',
          type: 'rowColumn',
          width: 21,
          height: 1,
          animations: [{ name: 'idle', frameRange: [0, 6] }],
          bottomPadding: 15,
          scale: 0.7,
        },
      ],
    },
    2: {
      x: 3,
      y: 7,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/BROTHER/animated-combined.png',
          type: 'rowColumn',
          width: 21,
          height: 1,
          animations: [{ name: 'idle', frameRange: [7, 13] }],
          bottomPadding: 10,
          scale: 0.7,
        },
      ],
    },
    3: {
      x: 3,
      y: 8,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/BROTHER/animated-combined.png',
          type: 'rowColumn',
          width: 21,
          height: 1,
          animations: [{ name: 'idle', frameRange: [14, 20] }],
          bottomPadding: 10,
          scale: 0.7,
        },
      ],
    },
  },
} as const;
