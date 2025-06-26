import type { SchemaType as ISchemaType } from '@dojoengine/sdk';

import {
  CairoCustomEnum,
  CairoOption,
  CairoOptionVariant,
  BigNumberish,
} from 'starknet';

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
  quest_id: BigNumberish;
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

// Type definition for `ponzi_land::models::land::LandValue` struct
export interface LandValue {
  block_date_bought: BigNumberish;
  owner: string;
  sell_price: BigNumberish;
  token_used: string;
  level: LevelEnum;
  quest_id: BigNumberish;
}

// Type definition for `ponzi_land::models::quest::GameCounter` struct
export interface GameCounter {
  key: BigNumberish;
  count: BigNumberish;
}

// Type definition for `ponzi_land::models::quest::GameCounterValue` struct
export interface GameCounterValue {
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

// Type definition for `ponzi_land::models::quest::GameMetadataValue` struct
export interface GameMetadataValue {
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

// Type definition for `ponzi_land::models::quest::PlayerRegistrations` struct
export interface PlayerRegistrations {
  details_id: BigNumberish;
  player_address: string;
  quest_id: BigNumberish;
}

// Type definition for `ponzi_land::models::quest::PlayerRegistrationsValue` struct
export interface PlayerRegistrationsValue {
  quest_id: BigNumberish;
}

// Type definition for `ponzi_land::models::quest::Quest` struct
export interface Quest {
  id: BigNumberish;
  details_id: BigNumberish;
  player_address: string;
  game_token_id: BigNumberish;
  completed: boolean;
}

// Type definition for `ponzi_land::models::quest::QuestCounter` struct
export interface QuestCounter {
  key: BigNumberish;
  count: BigNumberish;
}

// Type definition for `ponzi_land::models::quest::QuestCounterValue` struct
export interface QuestCounterValue {
  count: BigNumberish;
}

// Type definition for `ponzi_land::models::quest::QuestDetails` struct
export interface QuestDetails {
  id: BigNumberish;
  location: BigNumberish;
  reward: Reward;
  capacity: BigNumberish;
  participant_count: BigNumberish;
  settings_id: BigNumberish;
  target_score: BigNumberish;
  expires_at: BigNumberish;
  game_address: string;
}

// Type definition for `ponzi_land::models::quest::QuestDetailsCounter` struct
export interface QuestDetailsCounter {
  key: BigNumberish;
  count: BigNumberish;
}

// Type definition for `ponzi_land::models::quest::QuestDetailsCounterValue` struct
export interface QuestDetailsCounterValue {
  count: BigNumberish;
}

// Type definition for `ponzi_land::models::quest::QuestDetailsValue` struct
export interface QuestDetailsValue {
  location: BigNumberish;
  reward: Reward;
  capacity: BigNumberish;
  participant_count: BigNumberish;
  settings_id: BigNumberish;
  target_score: BigNumberish;
  expires_at: BigNumberish;
  game_address: string;
}

// Type definition for `ponzi_land::models::quest::QuestValue` struct
export interface QuestValue {
  details_id: BigNumberish;
  player_address: string;
  game_token_id: BigNumberish;
  completed: boolean;
}

// Type definition for `ponzi_land::models::quest::Reward` struct
export interface Reward {
  resource_type: BigNumberish;
  amount: BigNumberish;
}

// Type definition for `ponzi_land::models::quest::Score` struct
export interface Score {
  game_id: BigNumberish;
  score: BigNumberish;
}

// Type definition for `ponzi_land::models::quest::ScoreValue` struct
export interface ScoreValue {
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

// Type definition for `ponzi_land::models::quest::SettingsCounterValue` struct
export interface SettingsCounterValue {
  count: BigNumberish;
}

// Type definition for `ponzi_land::models::quest::SettingsDetails` struct
export interface SettingsDetails {
  id: BigNumberish;
  name: BigNumberish;
  description: string;
  exists: boolean;
}

// Type definition for `ponzi_land::models::quest::SettingsDetailsValue` struct
export interface SettingsDetailsValue {
  name: BigNumberish;
  description: string;
  exists: boolean;
}

// Type definition for `ponzi_land::models::quest::SettingsValue` struct
export interface SettingsValue {
  value: BigNumberish;
}

// Type definition for `ponzi_land::models::quest::TokenMetadata` struct
export interface TokenMetadata {
  token_id: BigNumberish;
  minted_by: string;
  player_name: BigNumberish;
  settings_id: BigNumberish;
  lifecycle: Lifecycle;
}

// Type definition for `ponzi_land::models::quest::TokenMetadataValue` struct
export interface TokenMetadataValue {
  minted_by: string;
  player_name: BigNumberish;
  settings_id: BigNumberish;
  lifecycle: Lifecycle;
}

// Type definition for `ponzi_land::components::taxes::TaxesComponent::LandTransferEvent` struct
export interface LandTransferEvent {
  from_location: BigNumberish;
  to_location: BigNumberish;
  token_address: string;
  amount: BigNumberish;
}

// Type definition for `ponzi_land::components::taxes::TaxesComponent::LandTransferEventValue` struct
export interface LandTransferEventValue {
  to_location: BigNumberish;
  token_address: string;
  amount: BigNumberish;
}

// Type definition for `ponzi_land::systems::actions::actions::AddStakeEvent` struct
export interface AddStakeEvent {
  land_location: BigNumberish;
  new_stake_amount: BigNumberish;
  owner: string;
}

// Type definition for `ponzi_land::systems::actions::actions::AddStakeEventValue` struct
export interface AddStakeEventValue {
  new_stake_amount: BigNumberish;
  owner: string;
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
export const level = ['Zero', 'First', 'Second'] as const;
export type Level = { [key in (typeof level)[number]]: string };
export type LevelEnum = CairoCustomEnum;

export interface SchemaType extends ISchemaType {
  ponzi_land: {
    Auction: Auction;
    AuctionValue: AuctionValue;
    Land: Land;
    LandStake: LandStake;
    LandStakeValue: LandStakeValue;
    LandValue: LandValue;
    GameCounter: GameCounter;
    GameCounterValue: GameCounterValue;
    GameMetadata: GameMetadata;
    GameMetadataValue: GameMetadataValue;
    Lifecycle: Lifecycle;
    PlayerRegistrations: PlayerRegistrations;
    PlayerRegistrationsValue: PlayerRegistrationsValue;
    Quest: Quest;
    QuestCounter: QuestCounter;
    QuestCounterValue: QuestCounterValue;
    QuestDetails: QuestDetails;
    QuestDetailsCounter: QuestDetailsCounter;
    QuestDetailsCounterValue: QuestDetailsCounterValue;
    QuestDetailsValue: QuestDetailsValue;
    QuestValue: QuestValue;
    Reward: Reward;
    Score: Score;
    ScoreValue: ScoreValue;
    Settings: Settings;
    SettingsCounter: SettingsCounter;
    SettingsCounterValue: SettingsCounterValue;
    SettingsDetails: SettingsDetails;
    SettingsDetailsValue: SettingsDetailsValue;
    SettingsValue: SettingsValue;
    TokenMetadata: TokenMetadata;
    TokenMetadataValue: TokenMetadataValue;
    LandTransferEvent: LandTransferEvent;
    LandTransferEventValue: LandTransferEventValue;
    AddStakeEvent: AddStakeEvent;
    AddStakeEventValue: AddStakeEventValue;
    AuctionFinishedEvent: AuctionFinishedEvent;
    AuctionFinishedEventValue: AuctionFinishedEventValue;
    LandBoughtEvent: LandBoughtEvent;
    LandBoughtEventValue: LandBoughtEventValue;
    LandNukedEvent: LandNukedEvent;
    LandNukedEventValue: LandNukedEventValue;
    NewAuctionEvent: NewAuctionEvent;
    NewAuctionEventValue: NewAuctionEventValue;
    AddressAuthorizedEvent: AddressAuthorizedEvent;
    AddressAuthorizedEventValue: AddressAuthorizedEventValue;
    AddressRemovedEvent: AddressRemovedEvent;
    AddressRemovedEventValue: AddressRemovedEventValue;
    VerifierUpdatedEvent: VerifierUpdatedEvent;
    VerifierUpdatedEventValue: VerifierUpdatedEventValue;
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
      decay_rate: 0,
      sold_at_price: new CairoOption(CairoOptionVariant.None),
    },
    AuctionValue: {
      start_time: 0,
      start_price: 0,
      floor_price: 0,
      is_finished: false,
      decay_rate: 0,
      sold_at_price: new CairoOption(CairoOptionVariant.None),
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
      quest_id: 0,
    },
    LandStake: {
      location: 0,
      last_pay_time: 0,
      amount: 0,
    },
    LandStakeValue: {
      last_pay_time: 0,
      amount: 0,
    },
    LandValue: {
      block_date_bought: 0,
      owner: '',
      sell_price: 0,
      token_used: '',
      level: new CairoCustomEnum({
        Zero: '',
        First: undefined,
        Second: undefined,
      }),
      quest_id: 0,
    },
    GameCounter: {
      key: 0,
      count: 0,
    },
    GameCounterValue: {
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
    GameMetadataValue: {
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
    PlayerRegistrations: {
      details_id: 0,
      player_address: '',
      quest_id: 0,
    },
    PlayerRegistrationsValue: {
      quest_id: 0,
    },
    Quest: {
      id: 0,
      details_id: 0,
      player_address: '',
      game_token_id: 0,
      completed: false,
    },
    QuestCounter: {
      key: 0,
      count: 0,
    },
    QuestCounterValue: {
      count: 0,
    },
    QuestDetails: {
      id: 0,
      location: 0,
      reward: { resource_type: 0, amount: 0 },
      capacity: 0,
      participant_count: 0,
      settings_id: 0,
      target_score: 0,
      expires_at: 0,
      game_address: '',
    },
    QuestDetailsCounter: {
      key: 0,
      count: 0,
    },
    QuestDetailsCounterValue: {
      count: 0,
    },
    QuestDetailsValue: {
      location: 0,
      reward: { resource_type: 0, amount: 0 },
      capacity: 0,
      participant_count: 0,
      settings_id: 0,
      target_score: 0,
      expires_at: 0,
      game_address: '',
    },
    QuestValue: {
      details_id: 0,
      player_address: '',
      game_token_id: 0,
      completed: false,
    },
    Reward: {
      resource_type: 0,
      amount: 0,
    },
    Score: {
      game_id: 0,
      score: 0,
    },
    ScoreValue: {
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
    SettingsCounterValue: {
      count: 0,
    },
    SettingsDetails: {
      id: 0,
      name: 0,
      description: '',
      exists: false,
    },
    SettingsDetailsValue: {
      name: 0,
      description: '',
      exists: false,
    },
    SettingsValue: {
      value: 0,
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
    TokenMetadataValue: {
      minted_by: '',
      player_name: 0,
      settings_id: 0,
      lifecycle: {
        mint: 0,
        start: new CairoOption(CairoOptionVariant.None),
        end: new CairoOption(CairoOptionVariant.None),
      },
    },
    LandTransferEvent: {
      from_location: 0,
      to_location: 0,
      token_address: '',
      amount: 0,
    },
    LandTransferEventValue: {
      to_location: 0,
      token_address: '',
      amount: 0,
    },
    AddStakeEvent: {
      land_location: 0,
      new_stake_amount: 0,
      owner: '',
    },
    AddStakeEventValue: {
      new_stake_amount: 0,
      owner: '',
    },
    AuctionFinishedEvent: {
      land_location: 0,
      buyer: '',
      final_price: 0,
    },
    AuctionFinishedEventValue: {
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
    LandBoughtEventValue: {
      sold_price: 0,
      seller: '',
      token_used: '',
    },
    LandNukedEvent: {
      owner_nuked: '',
      land_location: 0,
    },
    LandNukedEventValue: {
      land_location: 0,
    },
    NewAuctionEvent: {
      land_location: 0,
      start_price: 0,
      floor_price: 0,
    },
    NewAuctionEventValue: {
      start_price: 0,
      floor_price: 0,
    },
    AddressAuthorizedEvent: {
      address: '',
      authorized_at: 0,
    },
    AddressAuthorizedEventValue: {
      authorized_at: 0,
    },
    AddressRemovedEvent: {
      address: '',
      removed_at: 0,
    },
    AddressRemovedEventValue: {
      removed_at: 0,
    },
    VerifierUpdatedEvent: {
      new_verifier: 0,
      old_verifier: 0,
    },
    VerifierUpdatedEventValue: {
      old_verifier: 0,
    },
  },
};
export enum ModelsMapping {
  Auction = 'ponzi_land-Auction',
  AuctionValue = 'ponzi_land-AuctionValue',
  Land = 'ponzi_land-Land',
  LandStake = 'ponzi_land-LandStake',
  LandStakeValue = 'ponzi_land-LandStakeValue',
  LandValue = 'ponzi_land-LandValue',
  Level = 'ponzi_land-Level',
  GameCounter = 'ponzi_land-GameCounter',
  GameCounterValue = 'ponzi_land-GameCounterValue',
  GameMetadata = 'ponzi_land-GameMetadata',
  GameMetadataValue = 'ponzi_land-GameMetadataValue',
  Lifecycle = 'ponzi_land-Lifecycle',
  PlayerRegistrations = 'ponzi_land-PlayerRegistrations',
  PlayerRegistrationsValue = 'ponzi_land-PlayerRegistrationsValue',
  Quest = 'ponzi_land-Quest',
  QuestCounter = 'ponzi_land-QuestCounter',
  QuestCounterValue = 'ponzi_land-QuestCounterValue',
  QuestDetails = 'ponzi_land-QuestDetails',
  QuestDetailsCounter = 'ponzi_land-QuestDetailsCounter',
  QuestDetailsCounterValue = 'ponzi_land-QuestDetailsCounterValue',
  QuestDetailsValue = 'ponzi_land-QuestDetailsValue',
  QuestValue = 'ponzi_land-QuestValue',
  Reward = 'ponzi_land-Reward',
  Score = 'ponzi_land-Score',
  ScoreValue = 'ponzi_land-ScoreValue',
  Settings = 'ponzi_land-Settings',
  SettingsCounter = 'ponzi_land-SettingsCounter',
  SettingsCounterValue = 'ponzi_land-SettingsCounterValue',
  SettingsDetails = 'ponzi_land-SettingsDetails',
  SettingsDetailsValue = 'ponzi_land-SettingsDetailsValue',
  SettingsValue = 'ponzi_land-SettingsValue',
  TokenMetadata = 'ponzi_land-TokenMetadata',
  TokenMetadataValue = 'ponzi_land-TokenMetadataValue',
  LandTransferEvent = 'ponzi_land-LandTransferEvent',
  LandTransferEventValue = 'ponzi_land-LandTransferEventValue',
  AddStakeEvent = 'ponzi_land-AddStakeEvent',
  AddStakeEventValue = 'ponzi_land-AddStakeEventValue',
  AuctionFinishedEvent = 'ponzi_land-AuctionFinishedEvent',
  AuctionFinishedEventValue = 'ponzi_land-AuctionFinishedEventValue',
  LandBoughtEvent = 'ponzi_land-LandBoughtEvent',
  LandBoughtEventValue = 'ponzi_land-LandBoughtEventValue',
  LandNukedEvent = 'ponzi_land-LandNukedEvent',
  LandNukedEventValue = 'ponzi_land-LandNukedEventValue',
  NewAuctionEvent = 'ponzi_land-NewAuctionEvent',
  NewAuctionEventValue = 'ponzi_land-NewAuctionEventValue',
  AddressAuthorizedEvent = 'ponzi_land-AddressAuthorizedEvent',
  AddressAuthorizedEventValue = 'ponzi_land-AddressAuthorizedEventValue',
  AddressRemovedEvent = 'ponzi_land-AddressRemovedEvent',
  AddressRemovedEventValue = 'ponzi_land-AddressRemovedEventValue',
  VerifierUpdatedEvent = 'ponzi_land-VerifierUpdatedEvent',
  VerifierUpdatedEventValue = 'ponzi_land-VerifierUpdatedEventValue',
}
