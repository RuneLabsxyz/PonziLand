import { color } from 'three/src/nodes/TSL.js';

export const LORDS = {
  skin: 'LORDS',
  icon: '/tokens/LORDS/lords.png',
  biome: { x: 3, y: 1 },
  color: ' #000000',
  building: {
    1: {
      x: 0,
      y: 0,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/LORDS/animated-combined.png',
          type: 'rowColumn',
          width: 30,
          height: 1,
          animations: [{ name: 'idle', frameRange: [0, 9] }],
          bottomPadding: 15,
          scale: 0.8,
        },
      ],
    },
    2: {
      x: 0,
      y: 1,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/LORDS/animated-combined.png',
          type: 'rowColumn',
          width: 30,
          height: 1,
          animations: [{ name: 'idle', frameRange: [10, 19] }],
          bottomPadding: 10,
          scale: 0.8,
        },
      ],
    },
    3: {
      x: 0,
      y: 2,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/LORDS/animated-combined.png',
          type: 'rowColumn',
          width: 30,
          height: 1,
          animations: [{ name: 'idle', frameRange: [20, 29] }],
          bottomPadding: 10,
          scale: 0.8,
        },
      ],
    },
  },
} as const;
