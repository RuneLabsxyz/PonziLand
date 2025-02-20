import type { SchemaType as ISchemaType } from '@dojoengine/sdk';

import { CairoCustomEnum, type BigNumberish } from 'starknet';

type WithFieldOrder<T> = T & { fieldOrder: string[] };

// Type definition for `ponzi_land::models::auction::Auction` struct
export interface Auction {
  land_location: BigNumberish;
  start_time: BigNumberish;
  start_price: BigNumberish;
  floor_price: BigNumberish;
  is_finished: boolean;
  decay_rate: BigNumberish;
}

// Type definition for `ponzi_land::models::auction::AuctionValue` struct
export interface AuctionValue {
  start_time: BigNumberish;
  start_price: BigNumberish;
  floor_price: BigNumberish;
  is_finished: boolean;
  decay_rate: BigNumberish;
}

// Type definition for `ponzi_land::models::land::Land` struct
export interface Land {
  location: BigNumberish;
  block_date_bought: BigNumberish;
  owner: string;
  sell_price: BigNumberish;
  token_used: string;
  pool_key: PoolKey;
  last_pay_time: BigNumberish;
  stake_amount: BigNumberish;
  level: LevelEnum;
}

// Type definition for `ponzi_land::models::land::LandValue` struct
export interface LandValue {
  block_date_bought: BigNumberish;
  owner: string;
  sell_price: BigNumberish;
  token_used: string;
  pool_key: PoolKey;
  last_pay_time: BigNumberish;
  stake_amount: BigNumberish;
  level: LevelEnum;
}

// Type definition for `ponzi_land::models::land::PoolKey` struct
export interface PoolKey {
  token0: string;
  token1: string;
  fee: BigNumberish;
  tick_spacing: BigNumberish;
  extension: string;
}

// Type definition for `ponzi_land::systems::actions::actions::AuctionFinishedEvent` struct
export interface AuctionFinishedEvent {
  land_location: BigNumberish;
  buyer: string;
  start_time: BigNumberish;
  final_time: BigNumberish;
  final_price: BigNumberish;
}

// Type definition for `ponzi_land::systems::actions::actions::AuctionFinishedEventValue` struct
export interface AuctionFinishedEventValue {
  buyer: string;
  start_time: BigNumberish;
  final_time: BigNumberish;
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
  start_time: BigNumberish;
  start_price: BigNumberish;
  floor_price: BigNumberish;
}

// Type definition for `ponzi_land::systems::actions::actions::NewAuctionEventValue` struct
export interface NewAuctionEventValue {
  start_time: BigNumberish;
  start_price: BigNumberish;
  floor_price: BigNumberish;
}

// Type definition for `ponzi_land::systems::actions::actions::RemainingStakeEvent` struct
export interface RemainingStakeEvent {
  land_location: BigNumberish;
  remaining_stake: BigNumberish;
}

// Type definition for `ponzi_land::systems::actions::actions::RemainingStakeEventValue` struct
export interface RemainingStakeEventValue {
  remaining_stake: BigNumberish;
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
    PoolKey: WithFieldOrder<PoolKey>;
    AuctionFinishedEvent: WithFieldOrder<AuctionFinishedEvent>;
    AuctionFinishedEventValue: WithFieldOrder<AuctionFinishedEventValue>;
    LandBoughtEvent: WithFieldOrder<LandBoughtEvent>;
    LandBoughtEventValue: WithFieldOrder<LandBoughtEventValue>;
    LandNukedEvent: WithFieldOrder<LandNukedEvent>;
    LandNukedEventValue: WithFieldOrder<LandNukedEventValue>;
    NewAuctionEvent: WithFieldOrder<NewAuctionEvent>;
    NewAuctionEventValue: WithFieldOrder<NewAuctionEventValue>;
    RemainingStakeEvent: WithFieldOrder<RemainingStakeEvent>;
    RemainingStakeEventValue: WithFieldOrder<RemainingStakeEventValue>;
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
      ],
      land_location: 0,
      start_time: 0,
      start_price: 0,
      floor_price: 0,
      is_finished: false,
      decay_rate: 0,
    },
    AuctionValue: {
      fieldOrder: [
        'start_time',
        'start_price',
        'floor_price',
        'is_finished',
        'decay_rate',
      ],
      start_time: 0,
      start_price: 0,
      floor_price: 0,
      is_finished: false,
      decay_rate: 0,
    },
    Land: {
      fieldOrder: [
        'location',
        'block_date_bought',
        'owner',
        'sell_price',
        'token_used',
        'pool_key',
        'last_pay_time',
        'stake_amount',
        'level',
      ],
      location: 0,
      block_date_bought: 0,
      owner: '',
      sell_price: 0,
      token_used: '',
      pool_key: {
        token0: '',
        token1: '',
        fee: 0,
        tick_spacing: 0,
        extension: '',
      },
      last_pay_time: 0,
      stake_amount: 0,
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
      pool_key: {
        token0: '',
        token1: '',
        fee: 0,
        tick_spacing: 0,
        extension: '',
      },
      last_pay_time: 0,
      stake_amount: 0,
      level: new CairoCustomEnum({
        Zero: '',
        First: undefined,
        Second: undefined,
      }),
    },
    PoolKey: {
      fieldOrder: ['token0', 'token1', 'fee', 'tick_spacing', 'extension'],
      token0: '',
      token1: '',
      fee: 0,
      tick_spacing: 0,
      extension: '',
    },
    AuctionFinishedEvent: {
      fieldOrder: [
        'land_location',
        'buyer',
        'start_time',
        'final_time',
        'final_price',
      ],
      land_location: 0,
      buyer: '',
      start_time: 0,
      final_time: 0,
      final_price: 0,
    },
    AuctionFinishedEventValue: {
      fieldOrder: ['buyer', 'start_time', 'final_time', 'final_price'],
      buyer: '',
      start_time: 0,
      final_time: 0,
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
      fieldOrder: ['land_location', 'start_time', 'start_price', 'floor_price'],
      land_location: 0,
      start_time: 0,
      start_price: 0,
      floor_price: 0,
    },
    NewAuctionEventValue: {
      fieldOrder: ['start_time', 'start_price', 'floor_price'],
      start_time: 0,
      start_price: 0,
      floor_price: 0,
    },
    RemainingStakeEvent: {
      fieldOrder: ['land_location', 'remaining_stake'],
      land_location: 0,
      remaining_stake: 0,
    },
    RemainingStakeEventValue: {
      fieldOrder: ['remaining_stake'],
      remaining_stake: 0,
    },
  },
};
export enum ModelsMapping {
  Auction = 'ponzi_land-Auction',
  AuctionValue = 'ponzi_land-AuctionValue',
  Land = 'ponzi_land-Land',
  LandValue = 'ponzi_land-LandValue',
  Level = 'ponzi_land-Level',
  PoolKey = 'ponzi_land-PoolKey',
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
}
