export const LORDS = {
  skin: 'LORDS',
  icon: '/tokens/LORDS/lords.png',
  biome: { x: 3, y: 1 },
  building: {
    1: {
      x: 0,
      y: 0,
      useAnimation: true,
      animations: [
        {
          url: '/tokens/LORDS/1-animated.png',
          type: 'rowColumn',
          width: 3,
          height: 4,
          animations: [
            { name: 'idle', frameRange: [0, 9] }
          ],
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
          url: '/tokens/LORDS/2-animated.png',
          type: 'rowColumn',
          width: 3,
          height: 4,
          animations: [
            { name: 'idle', frameRange: [0, 9] }
          ],
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
          url: '/tokens/LORDS/3-animated.png',
          type: 'rowColumn',
          width: 3,
          height: 4,
          animations: [
            { name: 'idle', frameRange: [0, 9] }
          ],
          bottomPadding: 10,
          scale: 0.8,
        },
      ],
    },
  },
} as const;
