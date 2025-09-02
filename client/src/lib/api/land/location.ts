import { ensureNumber, parseLocation } from '$lib/utils';
import type { BigNumberish } from 'starknet';

export type Location = {
  x: number;
  y: number;
};

export function toLocation(value: BigNumberish): Location {
  // If value is object, return it
  if (typeof value === 'object') {
    return value;
  }

  const parsedLocation = parseLocation(ensureNumber(value));
  return { x: parsedLocation[0], y: parsedLocation[1] };
}

export function locationEquals(a: Location, b: Location) {
  return a.x === b.x && a.y === b.y;
}
