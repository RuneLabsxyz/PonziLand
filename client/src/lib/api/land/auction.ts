import { BaseLand } from '.';
import { type Auction as AuctionModel } from '$lib/models.gen';
import { toLocation } from './location';

export class AuctionLand extends BaseLand {
  constructor(auctionModel: AuctionModel) {
    super('auction', toLocation(auctionModel.land_location)!);
  }

  public update(model: AuctionModel) {
    // TODO
  }

  static is(land: BaseLand): land is AuctionLand {
    return land.type === 'auction';
  }
}
