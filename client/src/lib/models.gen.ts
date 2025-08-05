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

// Type definition for `ponzi_land::models::config::Config` struct
export interface Config {
	id: BigNumberish;
	grid_width: BigNumberish;
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
	center_location: BigNumberish;
	auction_duration: BigNumberish;
	scaling_factor: BigNumberish;
	linear_decay_time: BigNumberish;
	drop_rate: BigNumberish;
	rate_denominator: BigNumberish;
	max_circles: BigNumberish;
	claim_fee: BigNumberish;
	buy_fee: BigNumberish;
	our_contract_for_fee: string;
	our_contract_for_auction: string;
	claim_fee_threshold: BigNumberish;
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

// Type definition for `ponzi_land::components::taxes::TaxesComponent::LandTransferEvent` struct
export interface LandTransferEvent {
	from_location: BigNumberish;
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

// Type definition for `ponzi_land::systems::actions::actions::AuctionFinishedEvent` struct
export interface AuctionFinishedEvent {
	land_location: BigNumberish;
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

// Type definition for `ponzi_land::systems::actions::actions::LandNukedEvent` struct
export interface LandNukedEvent {
	owner_nuked: string;
	land_location: BigNumberish;
}

// Type definition for `ponzi_land::systems::actions::actions::NewAuctionEvent` struct
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
		Config: Config,
		Land: Land,
		LandStake: LandStake,
		LandTransferEvent: LandTransferEvent,
		AddStakeEvent: AddStakeEvent,
		AuctionFinishedEvent: AuctionFinishedEvent,
		LandBoughtEvent: LandBoughtEvent,
		LandNukedEvent: LandNukedEvent,
		NewAuctionEvent: NewAuctionEvent,
		AddressAuthorizedEvent: AddressAuthorizedEvent,
		AddressRemovedEvent: AddressRemovedEvent,
		VerifierUpdatedEvent: VerifierUpdatedEvent,
		ConfigUpdated: ConfigUpdated,
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
		Config: {
			id: 0,
			grid_width: 0,
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
			center_location: 0,
			auction_duration: 0,
			scaling_factor: 0,
			linear_decay_time: 0,
			drop_rate: 0,
			rate_denominator: 0,
			max_circles: 0,
			claim_fee: 0,
			buy_fee: 0,
			our_contract_for_fee: "",
			our_contract_for_auction: "",
			claim_fee_threshold: 0,
		},
		Land: {
			location: 0,
			block_date_bought: 0,
			owner: "",
		sell_price: 0,
			token_used: "",
		level: new CairoCustomEnum({ 
					Zero: "",
				First: undefined,
				Second: undefined, }),
		},
		LandStake: {
			location: 0,
		amount: 0,
			neighbors_info_packed: 0,
			accumulated_taxes_fee: 0,
		},
		LandTransferEvent: {
			from_location: 0,
			to_location: 0,
			token_address: "",
		amount: 0,
		},
		AddStakeEvent: {
			land_location: 0,
		new_stake_amount: 0,
			owner: "",
		},
		AuctionFinishedEvent: {
			land_location: 0,
			buyer: "",
		final_price: 0,
		},
		LandBoughtEvent: {
			buyer: "",
			land_location: 0,
		sold_price: 0,
			seller: "",
			token_used: "",
		},
		LandNukedEvent: {
			owner_nuked: "",
			land_location: 0,
		},
		NewAuctionEvent: {
			land_location: 0,
		start_price: 0,
		floor_price: 0,
		},
		AddressAuthorizedEvent: {
			address: "",
			authorized_at: 0,
		},
		AddressRemovedEvent: {
			address: "",
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
	LandTransferEvent = 'ponzi_land-LandTransferEvent',
	AddStakeEvent = 'ponzi_land-AddStakeEvent',
	AuctionFinishedEvent = 'ponzi_land-AuctionFinishedEvent',
	LandBoughtEvent = 'ponzi_land-LandBoughtEvent',
	LandNukedEvent = 'ponzi_land-LandNukedEvent',
	NewAuctionEvent = 'ponzi_land-NewAuctionEvent',
	AddressAuthorizedEvent = 'ponzi_land-AddressAuthorizedEvent',
	AddressRemovedEvent = 'ponzi_land-AddressRemovedEvent',
	VerifierUpdatedEvent = 'ponzi_land-VerifierUpdatedEvent',
	ConfigUpdated = 'ponzi_land-ConfigUpdated',
}