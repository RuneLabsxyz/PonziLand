import type { Token } from '$lib/interfaces';
import type { Auction, Land, LandStake } from '$lib/models.gen';
import { getTokenInfo, toHexWithPadding } from '$lib/utils';
import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
import { fromDojoLevel, type Level } from '$lib/utils/level';
import type { BigNumberish } from 'starknet';
import { BaseLand } from '.';
import {
  locationEquals,
  toLocation,
  type Location as LandLocation,
} from './location';

export class AuctionLand extends BaseLand {
  private _startTime!: Date;
  private _startPrice!: CurrencyAmount;
  private _floorPrice!: CurrencyAmount;
  private _isFinished!: boolean;
  private _decayRate!: BigNumberish;
  private _soldAtPrice?: CurrencyAmount;

  private static isLand(obj: Land | BaseLand): obj is Land {
    return 'block_date_bought' in obj;
  }

  constructor(landOrPrevious: Land | BaseLand, auction: Auction) {
    let location: LandLocation;
    let token: Token;

    if (AuctionLand.isLand(landOrPrevious)) {
      if (!landOrPrevious.location) {
        throw new Error('Land location is undefined');
      }
      location = toLocation(landOrPrevious.location);
      token = getTokenInfo(landOrPrevious.token_used)!; // Add non-null assertion since we know token info exists
    } else {
      location = landOrPrevious.location;
      token = landOrPrevious.token;
    }

    super('auction', location, token);

    if (AuctionLand.isLand(landOrPrevious)) {
      // Creating from Land model
      this._block_date_bought = landOrPrevious.block_date_bought;
      this._sell_price = landOrPrevious.sell_price;
      this._token_used = landOrPrevious.token_used;
      this.update(landOrPrevious, auction);
    } else {
      // Creating from previous land
      this._block_date_bought = landOrPrevious.block_date_bought;
      this._sell_price = landOrPrevious.sell_price;
      this._token_used = landOrPrevious.token_used;
      this._stakeAmount = landOrPrevious.stakeAmount;
      this._neighborsInfo = landOrPrevious.neighborsInfo;
      this._neighborsInfoPacked = landOrPrevious.neighborsInfoPacked;
      this._owner = toHexWithPadding(0);
      this._level = landOrPrevious.level;
      this._boughtAt = landOrPrevious.boughtAt;
      this._sellPrice = landOrPrevious.sellPrice;

      // Update auction specific properties
      this._startTime = new Date(Number(auction.start_time));
      this._startPrice = CurrencyAmount.fromUnscaled(
        auction.start_price,
        this._token,
      );
      this._floorPrice = CurrencyAmount.fromUnscaled(
        auction.floor_price,
        this._token,
      );
      this._isFinished = auction.is_finished;
      this._decayRate = auction.decay_rate;

      if (auction.sold_at_price && 'value' in auction.sold_at_price) {
        this._soldAtPrice = CurrencyAmount.fromUnscaled(
          auction.sold_at_price.value as BigNumberish,
          this._token,
        );
      } else {
        this._soldAtPrice = undefined;
      }
    }
  }

  public update(land: Land, auction: Auction) {
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
    this._owner = toHexWithPadding(0);
    this._level = fromDojoLevel(land.level);

    this._token = getTokenInfo(land.token_used)!;
    this._sellPrice = CurrencyAmount.fromUnscaled(land.sell_price, this._token);

    // Update auction specific properties
    this._startTime = new Date(Number(auction.start_time));
    this._startPrice = CurrencyAmount.fromUnscaled(
      auction.start_price,
      this._token,
    );
    this._floorPrice = CurrencyAmount.fromUnscaled(
      auction.floor_price,
      this._token,
    );
    this._isFinished = auction.is_finished;
    this._decayRate = auction.decay_rate;

    if (auction.sold_at_price && 'value' in auction.sold_at_price) {
      this._soldAtPrice = CurrencyAmount.fromUnscaled(
        auction.sold_at_price.value as BigNumberish,
        this._token,
      );
    } else {
      this._soldAtPrice = undefined;
    }
  }

  public updateStake(landStake: LandStake) {
    if (!locationEquals(toLocation(landStake.location)!, this.location)) {
      console.error('Wrong location!', landStake, this.location);
    }

    this._stakeAmount = CurrencyAmount.fromUnscaled(
      landStake.amount,
      this._token,
    );
  }

  static is(land: BaseLand): land is AuctionLand {
    return land.type === 'auction';
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

  // Auction specific accessors
  public get startTime(): Date {
    return this._startTime;
  }

  public get startPrice(): CurrencyAmount {
    return this._startPrice;
  }

  public get floorPrice(): CurrencyAmount {
    return this._floorPrice;
  }

  public get isFinished(): boolean {
    return this._isFinished;
  }

  public get decayRate(): BigNumberish {
    return this._decayRate;
  }

  public get soldAtPrice(): CurrencyAmount | undefined {
    return this._soldAtPrice;
  }
  //endregion
}
