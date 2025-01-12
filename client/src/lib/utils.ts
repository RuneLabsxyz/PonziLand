import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { cubicOut } from 'svelte/easing';
import type { TransitionConfig } from 'svelte/transition';
import data from '$lib/data.json';

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

export function toHexWithPadding(number: number, paddingLength = 64) {
  // Convert the number to a hexadecimal string
  let hex = number.toString(16);

  // Ensure it's lowercase and pad it to the desired length
  hex = hex.toLowerCase().padStart(paddingLength, '0');

  // Add the 0x prefix
  return '0x' + hex;
}

export function shortenHex(hex: string, length = 4) {
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
