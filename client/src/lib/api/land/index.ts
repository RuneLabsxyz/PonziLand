import {
  coordinatesToLocation,
  ensureNumber,
  padAddress,
  parseLocation,
} from '$lib/utils';
import type BigNumber from 'bignumber.js';
import type { BigNumberish, CairoOption } from 'starknet';

import { type Location } from './location';
import type { Readable } from 'svelte/store';

export type LandType = 'empty' | 'auction' | 'building';

export abstract class BaseLand {
  private _type: LandType;
  public readonly location: Location;
  public readonly locationString: string;

  constructor(type: LandType, location: Location) {
    this._type = type;
    this.location = location;
    this.locationString = padAddress(
      coordinatesToLocation(location).toString(),
    ) ?? "0x0";
  }

  get type() {
    return this._type;
  }
}

export class EmptyLand extends BaseLand {
  constructor(location: Location) {
    super('empty', location);
  }

  static is(land: BaseLand): land is EmptyLand {
    return land.type === 'empty';
  }
}
