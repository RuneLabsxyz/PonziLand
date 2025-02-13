import data from '$lib/data.json';
import { type ClassValue, clsx } from 'clsx';
import { cubicOut } from 'svelte/easing';
import type { TransitionConfig } from 'svelte/transition';
import { twMerge } from 'tailwind-merge';
import type { BigNumberish } from 'starknet';
import type { LandWithActions } from './api/land.svelte';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type FlyAndScaleParams = {
  y?: number;
  x?: number;
  start?: number;
  duration?: number;
};

export const flyAndScale = (
  node: Element,
  params: FlyAndScaleParams = { y: -8, x: 0, start: 0.95, duration: 150 },
): TransitionConfig => {
  const style = getComputedStyle(node);
  const transform = style.transform === 'none' ? '' : style.transform;

  const scaleConversion = (
    valueA: number,
    scaleA: [number, number],
    scaleB: [number, number],
  ) => {
    const [minA, maxA] = scaleA;
    const [minB, maxB] = scaleB;

    const percentage = (valueA - minA) / (maxA - minA);
    const valueB = percentage * (maxB - minB) + minB;

    return valueB;
  };

  const styleToString = (
    style: Record<string, number | string | undefined>,
  ): string => {
    return Object.keys(style).reduce((str, key) => {
      if (style[key] === undefined) return str;
      return str + `${key}:${style[key]};`;
    }, '');
  };

  return {
    duration: params.duration ?? 200,
    delay: 0,
    css: (t) => {
      const y = scaleConversion(t, [0, 1], [params.y ?? 5, 0]);
      const x = scaleConversion(t, [0, 1], [params.x ?? 0, 0]);
      const scale = scaleConversion(t, [0, 1], [params.start ?? 0.95, 1]);

      return styleToString({
        transform: `${transform} translate3d(${x}px, ${y}px, 0) scale(${scale})`,
        opacity: t,
      });
    },
    easing: cubicOut,
  };
};

export function toHexWithPadding(value: number | bigint, paddingLength = 64) {
  // Ensure the value is a bigint for consistent handling
  const bigIntValue = typeof value === 'bigint' ? value : BigInt(value);

  // Convert the bigint to a hexadecimal string
  let hex = bigIntValue.toString(16);

  // Ensure it's lowercase and pad it to the desired length
  hex = hex.toLowerCase().padStart(paddingLength, '0');

  // Add the 0x prefix
  return '0x' + hex;
}

export function shortenHex(hex: string | null | undefined, length = 4) {
  if (!hex) {
    return '0xundefined';
  }

  if (!hex.startsWith('0x')) {
    return hex;
  }

  if (hex.length <= 2 + 2 * length) {
    // No shortening needed
    return hex;
  }

  const start = hex.slice(0, 2 + length);
  const end = hex.slice(-length);
  return `${start}...${end}`;
}

export function getTokenInfo(tokenAddress: string) {
  // from data.available tokens
  const token = data.availableTokens.find(
    (token) => token.address === tokenAddress,
  );

  return token;
}

export function parseLocation(
  location: number | string | undefined,
): [number, number] {
  if (location === undefined) {
    return [-1, -1];
  }

  if (typeof location === 'string') {
    location = parseInt(location, 16);
  }

  // 64 grid give 0, 0
  const x = location % 64;
  const y = Math.floor(location / 64);

  return [x, y];
}

export function locationIntToString(location: number | string | undefined) {
  const [x, y] = parseLocation(location);
  return `${x}, ${y}`;
}

export function padAddress(address: string) {
  // test if start with 0x
  if (!address.startsWith('0x')) {
    return;
  }
  // get what is after 0x
  const addressEnd = address.slice(2);
  // padd for 66 char
  const addressPadded = addressEnd.padStart(64, '0');

  return `0x${addressPadded}`;
}

export function hexStringToNumber(hex: string) {
  const hexString = hex.startsWith('0x') ? hex.slice(2) : hex;
  return parseInt(hexString, 16);
}

export function toBigInt(value: BigNumberish): bigint | undefined {
  if (value == undefined) {
    return undefined;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return BigInt(value);
  }
  if (typeof value === 'bigint') {
    return value;
  }
  throw new Error('Unsupported BigNumberish type: ' + typeof value);
}

export function ensureNumber(value: BigNumberish) {
  if (typeof value === 'string') {
    return parseInt(value, 16);
  } else if (typeof value === 'bigint') {
    return Number(value);
  } else {
    return value;
  }
}

export function getNeighborsLocations(location: bigint) {
  const neighbors = [
    location - 65n,
    location - 64n,
    location - 63n,
    location - 1n,
    location + 1n,
    location + 63n,
    location + 64n,
    location + 65n,
  ];

  const up = location - 64n;
  const down = location + 64n;
  const left = location - 1n;
  const right = location + 1n;
  const upLeft = location - 65n;
  const upRight = location - 63n;
  const downLeft = location + 63n;
  const downRight = location + 65n;

  return { array: neighbors, up, down, left, right, upLeft, upRight, downLeft, downRight };
}

export function getNeighbours(
  locationString: string,
  landStore: LandWithActions[],
) {
  const location = toBigInt(locationString) ?? 0n;
  const neighbors = getNeighborsLocations(location).array;

  const neighborsHex = neighbors.map((loc) => toHexWithPadding(loc));

  const filteredStore = landStore.filter(
    (l) => l.owner !== toHexWithPadding(0),
  );

  console.log('filteredStore', filteredStore);
  console.log('location', location);
  console.log('neighbourHex', neighborsHex);

  const neighbours = neighborsHex.map((loc) => {
    return filteredStore.find((l) => {
      return l.location == loc;
    });
  });

  console.log('neighbours', neighbours);

  return neighbours;
}
