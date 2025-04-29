import type { Land, LandStake } from '$lib/models.gen';
import { locationEquals, toLocation } from './location';
import { BaseLand } from '.';
import { fromDojoLevel, type Level } from '$lib/utils/level';
import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
import type { Token } from '$lib/interfaces';
import { getTokenInfo } from '$lib/utils';

export class BuildingLand extends BaseLand {
  private _owner!: string;
  private _boughtAt!: Date;
  private _sellPrice!: CurrencyAmount;
  private _token!: Token;
  private _level!: Level;
  private _stakeAmount!: CurrencyAmount;
  private _lastPayTime!: Date;

  constructor(land: Land) {
    super('building', toLocation(land.location)!);
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
  //endregion
}
