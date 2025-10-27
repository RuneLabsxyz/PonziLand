import type { SchemaType as ISchemaType } from '@dojoengine/sdk';

import {
  CairoCustomEnum,
  CairoOption,
  CairoOptionVariant,
  type BigNumberish,
} from 'starknet';

// Type definition for `ponzi_land::models::auction::Auction` struct
export interface Auction {
  land_location: BigNumberish;
  start_time: BigNumberish;
  start_price: BigNumberish;
  floor_price: BigNumberish;
  is_finished: boolean;
  sold_at_price: CairoOption<BigNumberish>;
}

// Type definition for `ponzi_land::models::config::Config` struct
export interface Config {
  id: BigNumberish;
  tax_rate: BigNumberish;
  base_time: BigNumberish;
  price_decrease_rate: BigNumberish;
  time_speed: BigNumberish;
  max_auctions: BigNumberish;
  max_auctions_from_bid: BigNumberish;
  decay_rate: BigNumberish;
  floor_price: BigNumberish;
  liquidity_safety_multiplier: BigNumberish;
  min_auction_price: BigNumberish;
  min_auction_price_multiplier: BigNumberish;
  auction_duration: BigNumberish;
  scaling_factor: BigNumberish;
  linear_decay_time: BigNumberish;
  drop_rate: BigNumberish;
  rate_denominator: BigNumberish;
  max_circles: BigNumberish;
  claim_fee: BigNumberish;
  buy_fee: BigNumberish;
  quest_auction_chance: BigNumberish;
  quest_lands_enabled: boolean;
  our_contract_for_fee: string;
  our_contract_for_auction: string;
  claim_fee_threshold: BigNumberish;
  main_currency: string;
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

// Type definition for `ponzi_land::models::land::LandStake` struct
export interface LandStake {
  location: BigNumberish;
  amount: BigNumberish;
  neighbors_info_packed: BigNumberish;
  accumulated_taxes_fee: BigNumberish;
}

// Type definition for `ponzi_land::models::quest::GameCounter` struct
export interface GameCounter {
  key: BigNumberish;
  count: BigNumberish;
}

// Type definition for `ponzi_land::models::quest::GameMetadata` struct
export interface GameMetadata {
  contract_address: string;
  creator_address: string;
  name: BigNumberish;
  description: string;
  developer: BigNumberish;
  publisher: BigNumberish;
  genre: BigNumberish;
  image: string;
}

// Type definition for `ponzi_land::models::quest::Lifecycle` struct
export interface Lifecycle {
  mint: BigNumberish;
  start: CairoOption<BigNumberish>;
  end: CairoOption<BigNumberish>;
}

// Type definition for `ponzi_land::models::quest::Quest` struct
export interface Quest {
  id: BigNumberish;
  location: BigNumberish;
  creator_address: string;
  player_address: string;
  game_token_id: BigNumberish;
  completed: boolean;
  expires_at: BigNumberish;
}

// Type definition for `ponzi_land::models::quest::QuestCounter` struct
export interface QuestCounter {
  key: BigNumberish;
  count: BigNumberish;
}

// Type definition for `ponzi_land::models::quest::QuestDetails` struct
export interface QuestDetails {
  location: BigNumberish;
  capacity: BigNumberish;
  participant_count: BigNumberish;
  entry_price: BigNumberish;
  target_score: BigNumberish;
  creator_address: string;
  game_id: BigNumberish;
}

// Type definition for `ponzi_land::models::quest::QuestDetailsCounter` struct
export interface QuestDetailsCounter {
  key: BigNumberish;
  count: BigNumberish;
}

// Type definition for `ponzi_land::models::quest::QuestGame` struct
export interface QuestGame {
  id: BigNumberish;
  world_address: string;
  namespace: string;
  game_contract_name: string;
  settings_contract_name: string;
  settings_id: BigNumberish;
  target_score: BigNumberish;
  quest_type: QuestTypeEnum;
  game_name: string;
}

// Type definition for `ponzi_land::models::quest::QuestGameCounter` struct
export interface QuestGameCounter {
  key: BigNumberish;
  count: BigNumberish;
}

// Type definition for `ponzi_land::models::quest::Score` struct
export interface Score {
  game_id: BigNumberish;
  score: BigNumberish;
}

// Type definition for `ponzi_land::models::quest::Settings` struct
export interface Settings {
  id: BigNumberish;
  name: BigNumberish;
  value: BigNumberish;
}

// Type definition for `ponzi_land::models::quest::SettingsCounter` struct
export interface SettingsCounter {
  key: BigNumberish;
  count: BigNumberish;
}

// Type definition for `ponzi_land::models::quest::SettingsDetails` struct
export interface SettingsDetails {
  id: BigNumberish;
  name: BigNumberish;
  description: string;
  exists: boolean;
}

// Type definition for `ponzi_land::models::quest::TokenMetadata` struct
export interface TokenMetadata {
  token_id: BigNumberish;
  minted_by: string;
  player_name: BigNumberish;
  settings_id: BigNumberish;
  lifecycle: Lifecycle;
}

// Type definition for `ponzi_land::events::AddStakeEvent` struct
export interface AddStakeEvent {
  land_location: BigNumberish;
  new_stake_amount: BigNumberish;
  owner: string;
}

// Type definition for `ponzi_land::events::AuctionFinishedEvent` struct
export interface AuctionFinishedEvent {
  land_location: BigNumberish;
  buyer: string;
  final_price: BigNumberish;
}

// Type definition for `ponzi_land::events::LandBoughtEvent` struct
export interface LandBoughtEvent {
  buyer: string;
  land_location: BigNumberish;
  sold_price: BigNumberish;
  seller: string;
  token_used: string;
}

// Type definition for `ponzi_land::events::LandNukedEvent` struct
export interface LandNukedEvent {
  owner_nuked: string;
  land_location: BigNumberish;
}

// Type definition for `ponzi_land::events::LandTransferEvent` struct
export interface LandTransferEvent {
  from_location: BigNumberish;
  to_location: BigNumberish;
  token_address: string;
  amount: BigNumberish;
}

// Type definition for `ponzi_land::events::NewAuctionEvent` struct
export interface NewAuctionEvent {
  land_location: BigNumberish;
  start_price: BigNumberish;
  floor_price: BigNumberish;
}

// Type definition for `ponzi_land::systems::auth::auth::AddressAuthorizedEvent` struct
export interface AddressAuthorizedEvent {
  address: string;
  authorized_at: BigNumberish;
}

// Type definition for `ponzi_land::systems::auth::auth::AddressRemovedEvent` struct
export interface AddressRemovedEvent {
  address: string;
  removed_at: BigNumberish;
}

// Type definition for `ponzi_land::systems::auth::auth::VerifierUpdatedEvent` struct
export interface VerifierUpdatedEvent {
  new_verifier: BigNumberish;
  old_verifier: BigNumberish;
}

// Type definition for `ponzi_land::systems::config::config::ConfigUpdated` struct
export interface ConfigUpdated {
  field: BigNumberish;
  new_value: BigNumberish;
}

// Type definition for `ponzi_land::models::land::Level` enum
export const level = ['Zero', 'First', 'Second'] as const;
export type Level = { [key in (typeof level)[number]]: string };
export type LevelEnum = CairoCustomEnum;

// Type definition for `ponzi_land::models::quest::QuestType` enum
export const questType = ['None', 'Minigame', 'OneOnOne'] as const;
export type QuestType = { [key in (typeof questType)[number]]: string };
export type QuestTypeEnum = CairoCustomEnum;

export interface SchemaType extends ISchemaType {
  ponzi_land: {
    Auction: Auction;
    Config: Config;
    Land: Land;
    LandStake: LandStake;
    GameCounter: GameCounter;
    GameMetadata: GameMetadata;
    Lifecycle: Lifecycle;
    Quest: Quest;
    QuestCounter: QuestCounter;
    QuestDetails: QuestDetails;
    QuestDetailsCounter: QuestDetailsCounter;
    QuestGame: QuestGame;
    QuestGameCounter: QuestGameCounter;
    Score: Score;
    Settings: Settings;
    SettingsCounter: SettingsCounter;
    SettingsDetails: SettingsDetails;
    TokenMetadata: TokenMetadata;
    AddStakeEvent: AddStakeEvent;
    AuctionFinishedEvent: AuctionFinishedEvent;
    LandBoughtEvent: LandBoughtEvent;
    LandNukedEvent: LandNukedEvent;
    LandTransferEvent: LandTransferEvent;
    NewAuctionEvent: NewAuctionEvent;
    AddressAuthorizedEvent: AddressAuthorizedEvent;
    AddressRemovedEvent: AddressRemovedEvent;
    VerifierUpdatedEvent: VerifierUpdatedEvent;
    ConfigUpdated: ConfigUpdated;
  };
}
export const schema: SchemaType = {
  ponzi_land: {
    Auction: {
      land_location: 0,
      start_time: 0,
      start_price: 0,
      floor_price: 0,
      is_finished: false,
      sold_at_price: new CairoOption(CairoOptionVariant.None),
    },
    Config: {
      id: 0,
      tax_rate: 0,
      base_time: 0,
      price_decrease_rate: 0,
      time_speed: 0,
      max_auctions: 0,
      max_auctions_from_bid: 0,
      decay_rate: 0,
      floor_price: 0,
      liquidity_safety_multiplier: 0,
      min_auction_price: 0,
      min_auction_price_multiplier: 0,
      auction_duration: 0,
      scaling_factor: 0,
      linear_decay_time: 0,
      drop_rate: 0,
      rate_denominator: 0,
      max_circles: 0,
      claim_fee: 0,
      buy_fee: 0,
      quest_auction_chance: 0,
      quest_lands_enabled: false,
      our_contract_for_fee: '',
      our_contract_for_auction: '',
      claim_fee_threshold: 0,
      main_currency: '',
    },
    Land: {
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
    LandStake: {
      location: 0,
      amount: 0,
      neighbors_info_packed: 0,
      accumulated_taxes_fee: 0,
    },
    GameCounter: {
      key: 0,
      count: 0,
    },
    GameMetadata: {
      contract_address: '',
      creator_address: '',
      name: 0,
      description: '',
      developer: 0,
      publisher: 0,
      genre: 0,
      image: '',
    },
    Lifecycle: {
      mint: 0,
      start: new CairoOption(CairoOptionVariant.None),
      end: new CairoOption(CairoOptionVariant.None),
    },
    Quest: {
      id: 0,
      location: 0,
      creator_address: '',
      player_address: '',
      game_token_id: 0,
      completed: false,
      expires_at: 0,
    },
    QuestCounter: {
      key: 0,
      count: 0,
    },
    QuestDetails: {
      location: 0,
      capacity: 0,
      participant_count: 0,
      entry_price: 0,
      target_score: 0,
      creator_address: '',
      game_id: 0,
    },
    QuestDetailsCounter: {
      key: 0,
      count: 0,
    },
    QuestGame: {
      id: 0,
      world_address: '',
      namespace: '',
      game_contract_name: '',
      game_name: '',
      settings_contract_name: '',
      settings_id: 0,
      target_score: 0,
      quest_type: new CairoCustomEnum({
        None: '',
        Minigame: undefined,
        OneOnOne: undefined,
      }),
    },
    QuestGameCounter: {
      key: 0,
      count: 0,
    },
    Score: {
      game_id: 0,
      score: 0,
    },
    Settings: {
      id: 0,
      name: 0,
      value: 0,
    },
    SettingsCounter: {
      key: 0,
      count: 0,
    },
    SettingsDetails: {
      id: 0,
      name: 0,
      description: '',
      exists: false,
    },
    TokenMetadata: {
      token_id: 0,
      minted_by: '',
      player_name: 0,
      settings_id: 0,
      lifecycle: {
        mint: 0,
        start: new CairoOption(CairoOptionVariant.None),
        end: new CairoOption(CairoOptionVariant.None),
      },
    },
    AddStakeEvent: {
      land_location: 0,
      new_stake_amount: 0,
      owner: '',
    },
    AuctionFinishedEvent: {
      land_location: 0,
      buyer: '',
      final_price: 0,
    },
    LandBoughtEvent: {
      buyer: '',
      land_location: 0,
      sold_price: 0,
      seller: '',
      token_used: '',
    },
    LandNukedEvent: {
      owner_nuked: '',
      land_location: 0,
    },
    LandTransferEvent: {
      from_location: 0,
      to_location: 0,
      token_address: '',
      amount: 0,
    },
    NewAuctionEvent: {
      land_location: 0,
      start_price: 0,
      floor_price: 0,
    },
    AddressAuthorizedEvent: {
      address: '',
      authorized_at: 0,
    },
    AddressRemovedEvent: {
      address: '',
      removed_at: 0,
    },
    VerifierUpdatedEvent: {
      new_verifier: 0,
      old_verifier: 0,
    },
    ConfigUpdated: {
      field: 0,
      new_value: 0,
    },
  },
};
export enum ModelsMapping {
  Auction = 'ponzi_land-Auction',
  Config = 'ponzi_land-Config',
  Land = 'ponzi_land-Land',
  LandStake = 'ponzi_land-LandStake',
  Level = 'ponzi_land-Level',
  GameCounter = 'ponzi_land-GameCounter',
  GameMetadata = 'ponzi_land-GameMetadata',
  Lifecycle = 'ponzi_land-Lifecycle',
  Quest = 'ponzi_land-Quest',
  QuestCounter = 'ponzi_land-QuestCounter',
  QuestDetails = 'ponzi_land-QuestDetails',
  QuestDetailsCounter = 'ponzi_land-QuestDetailsCounter',
  QuestGame = 'ponzi_land-QuestGame',
  QuestGameCounter = 'ponzi_land-QuestGameCounter',
  QuestType = 'ponzi_land-QuestType',
  Score = 'ponzi_land-Score',
  Settings = 'ponzi_land-Settings',
  SettingsCounter = 'ponzi_land-SettingsCounter',
  SettingsDetails = 'ponzi_land-SettingsDetails',
  TokenMetadata = 'ponzi_land-TokenMetadata',
  AddStakeEvent = 'ponzi_land-AddStakeEvent',
  AuctionFinishedEvent = 'ponzi_land-AuctionFinishedEvent',
  LandBoughtEvent = 'ponzi_land-LandBoughtEvent',
  LandNukedEvent = 'ponzi_land-LandNukedEvent',
  LandTransferEvent = 'ponzi_land-LandTransferEvent',
  NewAuctionEvent = 'ponzi_land-NewAuctionEvent',
  AddressAuthorizedEvent = 'ponzi_land-AddressAuthorizedEvent',
  AddressRemovedEvent = 'ponzi_land-AddressRemovedEvent',
  VerifierUpdatedEvent = 'ponzi_land-VerifierUpdatedEvent',
  ConfigUpdated = 'ponzi_land-ConfigUpdated',
}
