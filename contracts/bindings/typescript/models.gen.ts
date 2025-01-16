import type { SchemaType as ISchemaType } from "@dojoengine/sdk";

import type { BigNumberish } from 'starknet';

type RemoveFieldOrder<T> = T extends object
  ? Omit<
      {
        [K in keyof T]: T[K] extends object ? RemoveFieldOrder<T[K]> : T[K];
      },
      'fieldOrder'
    >
  : T;
// Type definition for `ponzi_land::models::auction::Auction` struct
export interface Auction {
	fieldOrder: string[];
	land_location: BigNumberish;
	start_time: BigNumberish;
	start_price: BigNumberish;
	floor_price: BigNumberish;
	is_finished: boolean;
	decay_rate: BigNumberish;
}
export type InputAuction = RemoveFieldOrder<Auction>;

// Type definition for `ponzi_land::models::auction::AuctionValue` struct
export interface AuctionValue {
	fieldOrder: string[];
	start_time: BigNumberish;
	start_price: BigNumberish;
	floor_price: BigNumberish;
	is_finished: boolean;
	decay_rate: BigNumberish;
}
export type InputAuctionValue = RemoveFieldOrder<AuctionValue>;

// Type definition for `ponzi_land::models::land::LandValue` struct
export interface LandValue {
	fieldOrder: string[];
	block_date_bought: BigNumberish;
	owner: string;
	sell_price: BigNumberish;
	token_used: string;
	pool_key: string;
	last_pay_time: BigNumberish;
	stake_amount: BigNumberish;
}
export type InputLandValue = RemoveFieldOrder<LandValue>;

// Type definition for `ponzi_land::models::land::Land` struct
export interface Land {
	fieldOrder: string[];
	location: BigNumberish;
	block_date_bought: BigNumberish;
	owner: string;
	sell_price: BigNumberish;
	token_used: string;
	pool_key: string;
	last_pay_time: BigNumberish;
	stake_amount: BigNumberish;
}
export type InputLand = RemoveFieldOrder<Land>;

export interface SchemaType extends ISchemaType {
	ponzi_land: {
		Auction: Auction,
		AuctionValue: AuctionValue,
		LandValue: LandValue,
		Land: Land,
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
	},
};
// Type definition for ERC__Balance struct
export type ERC__Type = 'ERC20' | 'ERC721';
export interface ERC__Balance {
    fieldOrder: string[];
    balance: string;
    type: string;
    tokenMetadata: ERC__Token;
}
export interface ERC__Token {
    fieldOrder: string[];
    name: string;
    symbol: string;
    tokenId: string;
    decimals: string;
    contractAddress: string;
}
export interface ERC__Transfer {
    fieldOrder: string[];
    from: string;
    to: string;
    amount: string;
    type: string;
    executedAt: string;
    tokenMetadata: ERC__Token;
    transactionHash: string;
}