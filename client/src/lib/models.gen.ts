import type { SchemaType as ISchemaType } from '@dojoengine/sdk';

import {
  CairoCustomEnum,
  CairoOption,
  CairoOptionVariant,
  type BigNumberish,
} from 'starknet';

type WithFieldOrder<T> = T & { fieldOrder: string[] };

// Type definition for `ponzi_land::models::auction::Auction` struct
export interface Auction {
  land_location: BigNumberish;
  start_time: BigNumberish;
  start_price: BigNumberish;
  floor_price: BigNumberish;
  is_finished: boolean;
  decay_rate: BigNumberish;
  sold_at_price: CairoOption<BigNumberish>;
}

// Type definition for `ponzi_land::models::auction::AuctionValue` struct
export interface AuctionValue {
  start_time: BigNumberish;
  start_price: BigNumberish;
  floor_price: BigNumberish;
  is_finished: boolean;
  decay_rate: BigNumberish;
  sold_at_price: CairoOption<BigNumberish>;
}

// Type definition for `ponzi_land::models::land::Land` struct
export interface Land {
  location: BigNumberish;
  block_date_bought: BigNumberish;
  owner: string;
  sell_price: BigNumberish;
  token_used: string;
  level: LevelEnum;
}

// Type definition for `ponzi_land::models::land::LandValue` struct
export interface LandValue {
  block_date_bought: BigNumberish;
  owner: string;
  sell_price: BigNumberish;
  token_used: string;
  level: LevelEnum;
}

// Type definition for `ponzi_land::models::land::LandStake` struct
export interface LandStake {
  location: BigNumberish;
  last_pay_time: BigNumberish;
  amount: BigNumberish;
}

// Type definition for `ponzi_land::models::land::LandStakeValue` struct
export interface LandStakeValue {
  last_pay_time: BigNumberish;
  amount: BigNumberish;
}

// Type definition for `ponzi_land::systems::actions::actions::AuctionFinishedEvent` struct
export interface AuctionFinishedEvent {
  land_location: BigNumberish;
  buyer: string;
  final_price: BigNumberish;
}

// Type definition for `ponzi_land::systems::actions::actions::AuctionFinishedEventValue` struct
export interface AuctionFinishedEventValue {
  buyer: string;
  final_price: BigNumberish;
}

// Type definition for `ponzi_land::systems::actions::actions::LandBoughtEvent` struct
export interface LandBoughtEvent {
  buyer: string;
  land_location: BigNumberish;
  sold_price: BigNumberish;
  seller: string;
  token_used: string;
}

// Type definition for `ponzi_land::systems::actions::actions::LandBoughtEventValue` struct
export interface LandBoughtEventValue {
  sold_price: BigNumberish;
  seller: string;
  token_used: string;
}

// Type definition for `ponzi_land::systems::actions::actions::LandNukedEvent` struct
export interface LandNukedEvent {
  owner_nuked: string;
  land_location: BigNumberish;
}

// Type definition for `ponzi_land::systems::actions::actions::LandNukedEventValue` struct
export interface LandNukedEventValue {
  land_location: BigNumberish;
}

// Type definition for `ponzi_land::systems::actions::actions::NewAuctionEvent` struct
export interface NewAuctionEvent {
  land_location: BigNumberish;
  start_price: BigNumberish;
  floor_price: BigNumberish;
}

// Type definition for `ponzi_land::systems::actions::actions::NewAuctionEventValue` struct
export interface NewAuctionEventValue {
  start_price: BigNumberish;
  floor_price: BigNumberish;
}

// Type definition for `ponzi_land::systems::auth::auth::AddressAuthorizedEvent` struct
export interface AddressAuthorizedEvent {
  address: string;
  authorized_at: BigNumberish;
}

// Type definition for `ponzi_land::systems::auth::auth::AddressAuthorizedEventValue` struct
export interface AddressAuthorizedEventValue {
  authorized_at: BigNumberish;
}

// Type definition for `ponzi_land::systems::auth::auth::AddressRemovedEvent` struct
export interface AddressRemovedEvent {
  address: string;
  removed_at: BigNumberish;
}

// Type definition for `ponzi_land::systems::auth::auth::AddressRemovedEventValue` struct
export interface AddressRemovedEventValue {
  removed_at: BigNumberish;
}

// Type definition for `ponzi_land::systems::auth::auth::VerifierUpdatedEvent` struct
export interface VerifierUpdatedEvent {
  new_verifier: BigNumberish;
  old_verifier: BigNumberish;
}

// Type definition for `ponzi_land::systems::auth::auth::VerifierUpdatedEventValue` struct
export interface VerifierUpdatedEventValue {
  old_verifier: BigNumberish;
}

// Type definition for `ponzi_land::models::land::Level` enum
export type Level = {
  Zero: string;
  First: string;
  Second: string;
};
export type LevelEnum = CairoCustomEnum;

export interface SchemaType extends ISchemaType {
  ponzi_land: {
    Auction: WithFieldOrder<Auction>;
    AuctionValue: WithFieldOrder<AuctionValue>;
    Land: WithFieldOrder<Land>;
    LandValue: WithFieldOrder<LandValue>;
    LandStake: WithFieldOrder<LandStake>;
    LandStakeValue: WithFieldOrder<LandStakeValue>;
    AuctionFinishedEvent: WithFieldOrder<AuctionFinishedEvent>;
    AuctionFinishedEventValue: WithFieldOrder<AuctionFinishedEventValue>;
    LandBoughtEvent: WithFieldOrder<LandBoughtEvent>;
    LandBoughtEventValue: WithFieldOrder<LandBoughtEventValue>;
    LandNukedEvent: WithFieldOrder<LandNukedEvent>;
    LandNukedEventValue: WithFieldOrder<LandNukedEventValue>;
    NewAuctionEvent: WithFieldOrder<NewAuctionEvent>;
    NewAuctionEventValue: WithFieldOrder<NewAuctionEventValue>;
    AddressAuthorizedEvent: WithFieldOrder<AddressAuthorizedEvent>;
    AddressAuthorizedEventValue: WithFieldOrder<AddressAuthorizedEventValue>;
    AddressRemovedEvent: WithFieldOrder<AddressRemovedEvent>;
    AddressRemovedEventValue: WithFieldOrder<AddressRemovedEventValue>;
    VerifierUpdatedEvent: WithFieldOrder<VerifierUpdatedEvent>;
    VerifierUpdatedEventValue: WithFieldOrder<VerifierUpdatedEventValue>;
  };
}
export const schema: SchemaType = {
  ponzi_land: {
    Auction: {
      fieldOrder: [
        'land_location',
        'start_time',
        'start_price',
        'floor_price',
        'is_finished',
        'decay_rate',
        'sold_at_price',
      ],
      land_location: 0,
      start_time: 0,
      start_price: 0,
      floor_price: 0,
      is_finished: false,
      decay_rate: 0,
      sold_at_price: new CairoOption(CairoOptionVariant.None),
    },
    AuctionValue: {
      fieldOrder: [
        'start_time',
        'start_price',
        'floor_price',
        'is_finished',
        'decay_rate',
        'sold_at_price',
      ],
      start_time: 0,
      start_price: 0,
      floor_price: 0,
      is_finished: false,
      decay_rate: 0,
      sold_at_price: new CairoOption(CairoOptionVariant.None),
    },
    Land: {
      fieldOrder: [
        'location',
        'block_date_bought',
        'owner',
        'sell_price',
        'token_used',
        'level',
      ],
      location: 0,
      block_date_bought: 0,
      owner: '',
      sell_price: 0,
      token_used: '',
      level: new CairoCustomEnum({
        Zero: '',
        First: undefined,
        Second: undefined,
      }),
    },
    LandValue: {
      fieldOrder: [
        'block_date_bought',
        'owner',
        'sell_price',
        'token_used',
        'pool_key',
        'last_pay_time',
        'stake_amount',
        'level',
      ],
      block_date_bought: 0,
      owner: '',
      sell_price: 0,
      token_used: '',
      level: new CairoCustomEnum({
        Zero: '',
        First: undefined,
        Second: undefined,
      }),
    },
    LandStake: {
      fieldOrder: ['location', 'last_pay_time', 'amount'],
      location: 0,
      last_pay_time: 0,
      amount: 0,
    },
    LandStakeValue: {
      fieldOrder: ['last_pay_time', 'amount'],
      last_pay_time: 0,
      amount: 0,
    },
    AuctionFinishedEvent: {
      fieldOrder: ['land_location', 'buyer', 'final_price'],
      land_location: 0,
      buyer: '',
      final_price: 0,
    },
    AuctionFinishedEventValue: {
      fieldOrder: ['buyer', 'final_price'],
      buyer: '',
      final_price: 0,
    },
    LandBoughtEvent: {
      fieldOrder: [
        'buyer',
        'land_location',
        'sold_price',
        'seller',
        'token_used',
      ],
      buyer: '',
      land_location: 0,
      sold_price: 0,
      seller: '',
      token_used: '',
    },
    LandBoughtEventValue: {
      fieldOrder: ['sold_price', 'seller', 'token_used'],
      sold_price: 0,
      seller: '',
      token_used: '',
    },
    LandNukedEvent: {
      fieldOrder: ['owner_nuked', 'land_location'],
      owner_nuked: '',
      land_location: 0,
    },
    LandNukedEventValue: {
      fieldOrder: ['land_location'],
      land_location: 0,
    },
    NewAuctionEvent: {
      fieldOrder: ['land_location', 'start_price', 'floor_price'],
      land_location: 0,
      start_price: 0,
      floor_price: 0,
    },
    NewAuctionEventValue: {
      fieldOrder: ['start_price', 'floor_price'],
      start_price: 0,
      floor_price: 0,
    },
    AddressAuthorizedEvent: {
      fieldOrder: ['address', 'authorized_at'],
      address: '',
      authorized_at: 0,
    },
    AddressAuthorizedEventValue: {
      fieldOrder: ['authorized_at'],
      authorized_at: 0,
    },
    AddressRemovedEvent: {
      fieldOrder: ['address', 'removed_at'],
      address: '',
      removed_at: 0,
    },
    AddressRemovedEventValue: {
      fieldOrder: ['removed_at'],
      removed_at: 0,
    },
    VerifierUpdatedEvent: {
      fieldOrder: ['new_verifier', 'old_verifier'],
      new_verifier: 0,
      old_verifier: 0,
    },
    VerifierUpdatedEventValue: {
      fieldOrder: ['old_verifier'],
      old_verifier: 0,
    },
  },
};
export enum ModelsMapping {
  Auction = 'ponzi_land-Auction',
  AuctionValue = 'ponzi_land-AuctionValue',
  Land = 'ponzi_land-Land',
  LandValue = 'ponzi_land-LandValue',
  LandStake = 'ponzi_land-LandStake',
  LandStakeValue = 'ponzi_land-LandStakeValue',
  Level = 'ponzi_land-Level',
  AuctionFinishedEvent = 'ponzi_land-AuctionFinishedEvent',
  AuctionFinishedEventValue = 'ponzi_land-AuctionFinishedEventValue',
  LandBoughtEvent = 'ponzi_land-LandBoughtEvent',
  LandBoughtEventValue = 'ponzi_land-LandBoughtEventValue',
  LandNukedEvent = 'ponzi_land-LandNukedEvent',
  LandNukedEventValue = 'ponzi_land-LandNukedEventValue',
  NewAuctionEvent = 'ponzi_land-NewAuctionEvent',
  NewAuctionEventValue = 'ponzi_land-NewAuctionEventValue',
  RemainingStakeEvent = 'ponzi_land-RemainingStakeEvent',
  RemainingStakeEventValue = 'ponzi_land-RemainingStakeEventValue',
  AddressAuthorizedEvent = 'ponzi_land-AddressAuthorizedEvent',
  AddressAuthorizedEventValue = 'ponzi_land-AddressAuthorizedEventValue',
  AddressRemovedEvent = 'ponzi_land-AddressRemovedEvent',
  AddressRemovedEventValue = 'ponzi_land-AddressRemovedEventValue',
  VerifierUpdatedEvent = 'ponzi_land-VerifierUpdatedEvent',
  VerifierUpdatedEventValue = 'ponzi_land-VerifierUpdatedEventValue',
}
