import {
  type ISourceOptions,
  MoveDirection,
  OutMode,
} from '@tsparticles/engine';

export const particlesConfig: ISourceOptions = {
  fpsLimit: 120,
  style: {
    scale: "0.05",
  },
  particles: {
    bounce: {
      vertical: {
        value: {
          min: 0.01,
          max: 0.01,
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
        maxSpeed: 100,
      },
      speed: {
        min: 10,
        max: 12,
      },
      direction: MoveDirection.none,
      random: false,
      straight: false,
      outModes: {
        bottom: OutMode.split,
        left: OutMode.split,
        right: OutMode.split,
        default: OutMode.bounce,
        top: OutMode.none,
      },
    },
    shape: {
      type: 'image',
      options: {
        image: {
          src: '/assets/ui/icons/Icon_Coin1.png',
          width: 100,
          height: 100,
        },
      },
    },
  },
  detectRetina: true,
  background: {
    color: '#fff',
  },
  emitters: {
    direction: MoveDirection.top,
    life: {
      count: 0,
      duration: 0.15,
      delay: 5,
    },
    rate: {
      delay: 0.1,
      quantity: 1,
    },
    size: {
      width: 0,
      height: 0,
    },
  },
};
