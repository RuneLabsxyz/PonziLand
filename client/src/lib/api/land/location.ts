import { ensureNumber, parseLocation } from '$lib/utils';
import type { BigNumberish } from 'starknet';

export type Location = {
  x: number;
  y: number;
};

export function toLocation(
  value: BigNumberish | undefined,
): Location | undefined {
  if (value === undefined) return undefined;

  let parsedLocation = parseLocation(ensureNumber(value));
  return { x: parsedLocation[0], y: parsedLocation[1] };
}

export function locationEquals(a: Location, b: Location) {
  return a.x === b.x && a.y === b.y;
}
