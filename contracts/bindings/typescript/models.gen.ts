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
// Type definition for `ponzi_land::models::land::LandValue` struct
export interface LandValue {
	fieldOrder: string[];
	block_date_bought: BigNumberish;
	owner: string;
	sell_price: BigNumberish;
	token_used: string;
	pool_key: string;
	last_pay_time: BigNumberish;
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
}
export type InputLand = RemoveFieldOrder<Land>;

// Type definition for `ponzi_land::models::land::auction_info` struct
export interface AuctionInfo {
	fieldOrder: string[];
	location: BigNumberish;
	auction_start_time: BigNumberish;
	last_bid_time: BigNumberish;
	auction_price: BigNumberish;
}
export type InputAuctionInfo = RemoveFieldOrder<AuctionInfo>;

// Type definition for `ponzi_land::models::land::auction_infoValue` struct
export interface AuctionInfoValue {
	fieldOrder: string[];
	auction_start_time: BigNumberish;
	last_bid_time: BigNumberish;
	auction_price: BigNumberish;
}
export type InputAuctionInfoValue = RemoveFieldOrder<AuctionInfoValue>;

export interface SchemaType extends ISchemaType {
	ponzi_land: {
		LandValue: LandValue,
		Land: Land,
		auction_info: auction_info,
		auction_infoValue: auction_infoValue,
	},
}
export const schema: SchemaType = {
	ponzi_land: {
		LandValue: {
			fieldOrder: ['block_date_bought', 'owner', 'sell_price', 'token_used', 'pool_key', 'last_pay_time'],
			block_date_bought: 0,
			owner: "",
			sell_price: 0,
			token_used: "",
			pool_key: "",
			last_pay_time: 0,
		},
		Land: {
			fieldOrder: ['location', 'block_date_bought', 'owner', 'sell_price', 'token_used', 'pool_key', 'last_pay_time'],
			location: 0,
			block_date_bought: 0,
			owner: "",
			sell_price: 0,
			token_used: "",
			pool_key: "",
			last_pay_time: 0,
		},
		auction_info: {
			fieldOrder: ['location', 'auction_start_time', 'last_bid_time', 'auction_price'],
			location: 0,
			auction_start_time: 0,
			last_bid_time: 0,
			auction_price: 0,
		},
		auction_infoValue: {
			fieldOrder: ['auction_start_time', 'last_bid_time', 'auction_price'],
			auction_start_time: 0,
			last_bid_time: 0,
			auction_price: 0,
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