import type { SchemaType as ISchemaType } from "@dojoengine/sdk";

import { CairoCustomEnum, CairoOption, CairoOptionVariant, BigNumberish } from 'starknet';

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
export const level = [
	'Zero',
	'First',
	'Second',
] as const;
export type Level = { [key in typeof level[number]]: string };
export type LevelEnum = CairoCustomEnum;

export interface SchemaType extends ISchemaType {
	ponzi_land: {
		Auction: Auction,
		AuctionValue: AuctionValue,
		Land: Land,
		LandValue: LandValue,
		PoolKey: PoolKey,
		AuctionFinishedEvent: AuctionFinishedEvent,
		AuctionFinishedEventValue: AuctionFinishedEventValue,
		LandBoughtEvent: LandBoughtEvent,
		LandBoughtEventValue: LandBoughtEventValue,
		LandNukedEvent: LandNukedEvent,
		LandNukedEventValue: LandNukedEventValue,
		NewAuctionEvent: NewAuctionEvent,
		NewAuctionEventValue: NewAuctionEventValue,
		RemainingStakeEvent: RemainingStakeEvent,
		RemainingStakeEventValue: RemainingStakeEventValue,
		AddressAuthorizedEvent: AddressAuthorizedEvent,
		AddressAuthorizedEventValue: AddressAuthorizedEventValue,
		AddressRemovedEvent: AddressRemovedEvent,
		AddressRemovedEventValue: AddressRemovedEventValue,
		VerifierUpdatedEvent: VerifierUpdatedEvent,
		VerifierUpdatedEventValue: VerifierUpdatedEventValue,
	},
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
			owner: "",
		sell_price: 0,
			token_used: "",
		pool_key: { token0: "", token1: "", fee: 0, tick_spacing: 0, extension: "", },
			last_pay_time: 0,
		stake_amount: 0,
		level: new CairoCustomEnum({ 
					Zero: "",
				First: undefined,
				Second: undefined, }),
		},
		LandValue: {
			block_date_bought: 0,
			owner: "",
		sell_price: 0,
			token_used: "",
		pool_key: { token0: "", token1: "", fee: 0, tick_spacing: 0, extension: "", },
			last_pay_time: 0,
		stake_amount: 0,
		level: new CairoCustomEnum({ 
					Zero: "",
				First: undefined,
				Second: undefined, }),
		},
		PoolKey: {
			token0: "",
			token1: "",
			fee: 0,
			tick_spacing: 0,
			extension: "",
		},
		AuctionFinishedEvent: {
			land_location: 0,
			buyer: "",
			start_time: 0,
			final_time: 0,
		final_price: 0,
		},
		AuctionFinishedEventValue: {
			buyer: "",
			start_time: 0,
			final_time: 0,
		final_price: 0,
		},
		LandBoughtEvent: {
			buyer: "",
			land_location: 0,
		sold_price: 0,
			seller: "",
			token_used: "",
		},
		LandBoughtEventValue: {
		sold_price: 0,
			seller: "",
			token_used: "",
		},
		LandNukedEvent: {
			owner_nuked: "",
			land_location: 0,
		},
		LandNukedEventValue: {
			land_location: 0,
		},
		NewAuctionEvent: {
			land_location: 0,
			start_time: 0,
		start_price: 0,
		floor_price: 0,
		},
		NewAuctionEventValue: {
			start_time: 0,
		start_price: 0,
		floor_price: 0,
		},
		RemainingStakeEvent: {
			land_location: 0,
		remaining_stake: 0,
		},
		RemainingStakeEventValue: {
		remaining_stake: 0,
		},
		AddressAuthorizedEvent: {
			address: "",
			authorized_at: 0,
		},
		AddressAuthorizedEventValue: {
			authorized_at: 0,
		},
		AddressRemovedEvent: {
			address: "",
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
	AddressAuthorizedEvent = 'ponzi_land-AddressAuthorizedEvent',
	AddressAuthorizedEventValue = 'ponzi_land-AddressAuthorizedEventValue',
	AddressRemovedEvent = 'ponzi_land-AddressRemovedEvent',
	AddressRemovedEventValue = 'ponzi_land-AddressRemovedEventValue',
	VerifierUpdatedEvent = 'ponzi_land-VerifierUpdatedEvent',
	VerifierUpdatedEventValue = 'ponzi_land-VerifierUpdatedEventValue',
}