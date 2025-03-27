import {
  clamp,
  type ISourceOptions,
  MoveDirection,
  OutMode,
} from '@tsparticles/engine';

export const particlesConfig: ISourceOptions = {
  fpsLimit: 120,
  style: {
    scale: '0.1',
  },
  particles: {
    bounce: {
      vertical: {
        value: {
          min: 0.001,
          max: 0.001,
        },
      },
    },
    color: {
      value: ['#FF0000'],
    },
    number: {
      value: 0,
    },
    destroy: {
      mode: 'split',
      split: {
        count: 2,
        factor: {
          value: {
            min: 2,
            max: 2,
          },
        },
        rate: {
          value: {
            min: 2,
            max: 3,
          },
        },
      },
    },
    opacity: {
      value: 1,
    },
    size: {
      value: {
        min: 30,
        max: 30,
      },
    },
    move: {
      enable: true,
      gravity: {
        enable: true,
        acceleration: 40,
        maxSpeed: 40,
      },
      speed: {
        min: 20,
        max: 25,
      },
      direction: MoveDirection.top,
      random: false,
      outModes: {
        bottom: OutMode.destroy,
        left: OutMode.destroy,
        right: OutMode.destroy,
        default: OutMode.bounce,
        top: OutMode.none,
      },
    },
    shape: {
      type: 'image',
      options: {
        image: {
          src: '/ui/icons/Icon_Coin1.png',
          width: 100,
          height: 100,
        },
      },
    },
  },
  detectRetina: true,
  emitters: {
    position: {
      x: 50,
      y: 50,
    },
    direction: MoveDirection.top,
    life: {
      count: 1,
      duration: 0.3,
      delay: 5,
    },
    rate: {
      delay: 0.001,
      quantity: 1,
    },
    size: {
      width: 10,
      height: 10,
    },
  },
};
