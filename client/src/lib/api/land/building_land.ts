import type { Land, LandStake } from '$lib/models.gen';
import { locationEquals, toLocation } from './location';
import { BaseLand } from '.';
import { fromDojoLevel, type Level } from '$lib/utils/level';
import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
import type { Token } from '$lib/interfaces';
import { getTokenInfo, coordinatesToLocation } from '$lib/utils';
import type { BigNumberish } from 'starknet';

export class BuildingLand extends BaseLand {
  static fromBuildingLand(land: BuildingLand): BuildingLand {
    // Create a new Land object with the same data
    const landData: Land = {
      owner: land._owner,
      location: coordinatesToLocation(land.location),
      block_date_bought: land._block_date_bought,
      sell_price: land._sell_price,
      token_used: land._token_used,
      level: land._level
    } as unknown as Land;

    // Create new instance
    const newLand = new BuildingLand(landData);

    // Copy over stake data
    newLand._stakeAmount = land._stakeAmount;
    newLand._lastPayTime = land._lastPayTime;

    return newLand;
  }

  constructor(land: Land) {
    super(
      'building',
      toLocation(land.location)!,
      getTokenInfo(land.token_used)!,
    );
    this._block_date_bought = land.block_date_bought;
    this._sell_price = land.sell_price;
    this._token_used = land.token_used;
    this.update(land);
  }

  public update(land: Land) {
    // Assert that the location is the same
    if (!locationEquals(toLocation(land.location)!, this.location)) {
      console.error(
        'Wrong location!',
        land,
        toLocation(land.location),
        this.location,
      );
    }

    this._boughtAt = new Date(Number(land.block_date_bought));
    this._owner = land.owner;
    this._level = fromDojoLevel(land.level);

    this._token = getTokenInfo(land.token_used)!;
    this._sellPrice = CurrencyAmount.fromUnscaled(land.sell_price, this._token);
  }

  public updateStake(landStake: LandStake) {
    if (!locationEquals(toLocation(landStake.location)!, this.location)) {
      console.error('Wrong location!', landStake, this.location);
    }

    this._stakeAmount = CurrencyAmount.fromUnscaled(
      landStake.amount,
      this._token,
    );

    this._lastPayTime = new Date(Number(landStake.last_pay_time));
  }

  static is(land: BaseLand): land is BuildingLand {
    return land.type === 'building';
  }

  //region Accessors
  public get owner(): string {
    return this._owner;
  }

  public get level(): Level {
    return this._level;
  }

  public get boughtAt(): Date {
    return this._boughtAt;
  }

  public get sellPrice(): CurrencyAmount {
    return this._sellPrice;
  }

  public get token(): Token {
    return this._token;
  }

  public get stakeAmount(): CurrencyAmount {
    return this._stakeAmount;
  }

  public get lastPayTime(): Date {
    return this._lastPayTime;
  }

  public get block_date_bought(): BigNumberish {
    return this._block_date_bought;
  }

  public get sell_price(): BigNumberish {
    return this._sell_price;
  }

  public get token_used(): string {
    return this._token_used;
  }

  public get tokenUsed(): string {
    return this._token_used;
  }

  public get tokenAddress(): string {
    return this._token.address;
  }
  //endregion
}
