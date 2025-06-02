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
	level: LevelEnum;
}

// Type definition for `ponzi_land::models::land::LandStake` struct
export interface LandStake {
	location: BigNumberish;
	amount: BigNumberish;
	neighbors_info_packed: BigNumberish;
}

// Type definition for `ponzi_land::models::land::LandStakeValue` struct
export interface LandStakeValue {
	amount: BigNumberish;
	neighbors_info_packed: BigNumberish;
}

// Type definition for `ponzi_land::models::land::LandValue` struct
export interface LandValue {
	block_date_bought: BigNumberish;
	owner: string;
	sell_price: BigNumberish;
	token_used: string;
	level: LevelEnum;
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
		LandStake: LandStake,
		LandStakeValue: LandStakeValue,
		LandValue: LandValue,
		LandTransferEvent: LandTransferEvent,
		LandTransferEventValue: LandTransferEventValue,
		AddStakeEvent: AddStakeEvent,
		AddStakeEventValue: AddStakeEventValue,
		AuctionFinishedEvent: AuctionFinishedEvent,
		AuctionFinishedEventValue: AuctionFinishedEventValue,
		LandBoughtEvent: LandBoughtEvent,
		LandBoughtEventValue: LandBoughtEventValue,
		LandNukedEvent: LandNukedEvent,
		LandNukedEventValue: LandNukedEventValue,
		NewAuctionEvent: NewAuctionEvent,
		NewAuctionEventValue: NewAuctionEventValue,
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
		level: new CairoCustomEnum({ 
					Zero: "",
				First: undefined,
				Second: undefined, }),
		},
		LandStake: {
			location: 0,
		amount: 0,
			neighbors_info_packed: 0,
		},
		LandStakeValue: {
		amount: 0,
			neighbors_info_packed: 0,
		},
		LandValue: {
			block_date_bought: 0,
			owner: "",
		sell_price: 0,
			token_used: "",
		level: new CairoCustomEnum({ 
					Zero: "",
				First: undefined,
				Second: undefined, }),
		},
		LandTransferEvent: {
			from_location: 0,
			to_location: 0,
			token_address: "",
		amount: 0,
		},
		LandTransferEventValue: {
			to_location: 0,
			token_address: "",
		amount: 0,
		},
		AddStakeEvent: {
			land_location: 0,
		new_stake_amount: 0,
			owner: "",
		},
		AddStakeEventValue: {
		new_stake_amount: 0,
			owner: "",
		},
		AuctionFinishedEvent: {
			land_location: 0,
			buyer: "",
		final_price: 0,
		},
		AuctionFinishedEventValue: {
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
		start_price: 0,
		floor_price: 0,
		},
		NewAuctionEventValue: {
		start_price: 0,
		floor_price: 0,
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
	LandStake = 'ponzi_land-LandStake',
	LandStakeValue = 'ponzi_land-LandStakeValue',
	LandValue = 'ponzi_land-LandValue',
	Level = 'ponzi_land-Level',
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