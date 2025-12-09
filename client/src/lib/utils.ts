import data from '$profileData';
import { type ClassValue, clsx } from 'clsx';
import type { BigNumberish } from 'starknet';
import { cubicOut } from 'svelte/easing';
import type { TransitionConfig } from 'svelte/transition';
import { twMerge } from 'tailwind-merge';
import type { LandWithActions } from './api/land';
import type { TokenMetadata, Token } from './interfaces';
import { getTokenMetadata as getTokenData } from './tokens';
import { COORD_MULTIPLIER, COORD_MASK } from './const';

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
    (token) => padAddress(token.address) === padAddress(tokenAddress),
  );

  return token;
}

/**
 * Retrieve metadata for a token associated with the provided skin identifier.
 *
 * @param skin - A string identifier for the skin whose token metadata should be retrieved.
 *               This may be a name, key, or other identifier used by the lookup system.
 * @returns The TokenMetadata object for the given skin, or `null` if no metadata is found.
 *
 * @remarks
 * The function performs a lookup and does not mutate any external state. Consumers should
 * handle the `null` case to account for missing or unknown skins.
 */
export function getTokenMetadata(skin: string): TokenMetadata | null {
  return getTokenData(skin);
}

/**
 * Get complete token information including both basic token info and metadata.
 * This combines token info from the available tokens list and metadata from the skin system.
 *
 * @param tokenAddress - The token contract address to look up
 * @returns Object containing both token info and metadata, or null if token is not found
 */
export function getFullTokenInfo(tokenAddress: string): {
  token: Token;
  metadata: TokenMetadata | null;
} | null {
  const token = getTokenInfo(tokenAddress);
  if (!token) {
    return null;
  }

  const metadata = getTokenMetadata(token.skin);
  return { token, metadata };
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

  // New coordinate system matching contracts/src/helpers/coord.cairo
  // index_to_position: row = index / COORD_MULTIPLIER, col = index & COORD_MASK
  const col = location & COORD_MASK; // Extract low 8 bits (col)
  const row = Math.floor(location / COORD_MULTIPLIER); // Extract high 8 bits (row)

  // Return as [x, y] where x=col, y=row
  return [col, row];
}

export function locationIntToString(location: number | string | undefined) {
  const [x, y] = parseLocation(location);
  return `${x}, ${y}`;
}

export function locationToCoordinates(location: number | string | undefined) {
  const [x, y] = parseLocation(location);
  return { x, y };
}

export function coordinatesToLocation(location: { x: number; y: number }) {
  // New coordinate system matching contracts/src/helpers/coord.cairo
  // position_to_index: row * COORD_MULTIPLIER + col, where row=y, col=x
  return location.y * COORD_MULTIPLIER + location.x;
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

export function groupLands(lands: LandWithActions[]) {
  const map = new Map();
  console.log('lands after group', lands);
  for (const land of lands) {
    const key = `${land.token?.name}__${land.token?.address}`;
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(land);
  }

  return Array.from(map.entries());
}

// Re-export formatting utilities
export { formatPercentage, formatPercentageFixed } from './utils/format';
