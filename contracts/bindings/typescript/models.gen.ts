import type { SchemaType as ISchemaType } from "@dojoengine/sdk";

import { BigNumberish } from 'starknet';

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
	pool_key: string;
	last_pay_time: BigNumberish;
	stake_amount: BigNumberish;
}

// Type definition for `ponzi_land::models::land::LandValue` struct
export interface LandValue {
	block_date_bought: BigNumberish;
	owner: string;
	sell_price: BigNumberish;
	token_used: string;
	pool_key: string;
	last_pay_time: BigNumberish;
	stake_amount: BigNumberish;
}

// Type definition for `ponzi_land::systems::actions::actions::AuctionFinishedEvent` struct
export interface AuctionFinishedEvent {
	land_location: BigNumberish;
	start_time: BigNumberish;
	final_time: BigNumberish;
	final_price: BigNumberish;
}

// Type definition for `ponzi_land::systems::actions::actions::AuctionFinishedEventValue` struct
export interface AuctionFinishedEventValue {
	start_time: BigNumberish;
	final_time: BigNumberish;
	final_price: BigNumberish;
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

// Type definition for `ponzi_land::systems::actions::actions::NewLandEvent` struct
export interface NewLandEvent {
	owner_land: string;
	land_location: BigNumberish;
	token_for_sale: string;
	sell_price: BigNumberish;
}

// Type definition for `ponzi_land::systems::actions::actions::NewLandEventValue` struct
export interface NewLandEventValue {
	token_for_sale: string;
	sell_price: BigNumberish;
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

export interface SchemaType extends ISchemaType {
	ponzi_land: {
		Auction: WithFieldOrder<Auction>,
		AuctionValue: WithFieldOrder<AuctionValue>,
		Land: WithFieldOrder<Land>,
		LandValue: WithFieldOrder<LandValue>,
		AuctionFinishedEvent: WithFieldOrder<AuctionFinishedEvent>,
		AuctionFinishedEventValue: WithFieldOrder<AuctionFinishedEventValue>,
		LandNukedEvent: WithFieldOrder<LandNukedEvent>,
		LandNukedEventValue: WithFieldOrder<LandNukedEventValue>,
		NewAuctionEvent: WithFieldOrder<NewAuctionEvent>,
		NewAuctionEventValue: WithFieldOrder<NewAuctionEventValue>,
		NewLandEvent: WithFieldOrder<NewLandEvent>,
		NewLandEventValue: WithFieldOrder<NewLandEventValue>,
		RemainingStakeEvent: WithFieldOrder<RemainingStakeEvent>,
		RemainingStakeEventValue: WithFieldOrder<RemainingStakeEventValue>,
	},
}
export const schema: SchemaType = {
	ponzi_land: {
		Auction: {
			fieldOrder: ['land_location', 'start_time', 'start_price', 'floor_price', 'is_finished', 'decay_rate'],
			land_location: 0,
			start_time: 0,
		start_price: 0,
		floor_price: 0,
			is_finished: false,
			decay_rate: 0,
		},
		AuctionValue: {
			fieldOrder: ['start_time', 'start_price', 'floor_price', 'is_finished', 'decay_rate'],
			start_time: 0,
		start_price: 0,
		floor_price: 0,
			is_finished: false,
			decay_rate: 0,
		},
		Land: {
			fieldOrder: ['location', 'block_date_bought', 'owner', 'sell_price', 'token_used', 'pool_key', 'last_pay_time', 'stake_amount'],
			location: 0,
			block_date_bought: 0,
			owner: "",
		sell_price: 0,
			token_used: "",
			pool_key: "",
			last_pay_time: 0,
		stake_amount: 0,
		},
		LandValue: {
			fieldOrder: ['block_date_bought', 'owner', 'sell_price', 'token_used', 'pool_key', 'last_pay_time', 'stake_amount'],
			block_date_bought: 0,
			owner: "",
		sell_price: 0,
			token_used: "",
			pool_key: "",
			last_pay_time: 0,
		stake_amount: 0,
		},
		AuctionFinishedEvent: {
			fieldOrder: ['land_location', 'start_time', 'final_time', 'final_price'],
			land_location: 0,
			start_time: 0,
			final_time: 0,
		final_price: 0,
		},
		AuctionFinishedEventValue: {
			fieldOrder: ['start_time', 'final_time', 'final_price'],
			start_time: 0,
			final_time: 0,
		final_price: 0,
		},
		LandNukedEvent: {
			fieldOrder: ['owner_nuked', 'land_location'],
			owner_nuked: "",
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
		NewLandEvent: {
			fieldOrder: ['owner_land', 'land_location', 'token_for_sale', 'sell_price'],
			owner_land: "",
			land_location: 0,
			token_for_sale: "",
		sell_price: 0,
		},
		NewLandEventValue: {
			fieldOrder: ['token_for_sale', 'sell_price'],
			token_for_sale: "",
		sell_price: 0,
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
	AuctionFinishedEvent = 'ponzi_land-AuctionFinishedEvent',
	AuctionFinishedEventValue = 'ponzi_land-AuctionFinishedEventValue',
	LandNukedEvent = 'ponzi_land-LandNukedEvent',
	LandNukedEventValue = 'ponzi_land-LandNukedEventValue',
	NewAuctionEvent = 'ponzi_land-NewAuctionEvent',
	NewAuctionEventValue = 'ponzi_land-NewAuctionEventValue',
	NewLandEvent = 'ponzi_land-NewLandEvent',
	NewLandEventValue = 'ponzi_land-NewLandEventValue',
	RemainingStakeEvent = 'ponzi_land-RemainingStakeEvent',
	RemainingStakeEventValue = 'ponzi_land-RemainingStakeEventValue',
}