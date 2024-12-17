import type { SchemaType } from "@dojoengine/sdk";

// Type definition for `ponzi_land::models::land::LandValue` struct
export interface LandValue {
	fieldOrder: string[];
	block_date_bought: number;
	owner: string;
	sell_price: number;
	token_used: string;
	pool_key: string;
}

// Type definition for `ponzi_land::models::land::Land` struct
export interface Land {
	fieldOrder: string[];
	location: number;
	block_date_bought: number;
	owner: string;
	sell_price: number;
	token_used: string;
	pool_key: string;
}

export interface PonziLandSchemaType extends SchemaType {
	ponzi_land: {
		LandValue: LandValue,
		Land: Land,
		ERC__Balance: ERC__Balance,
		ERC__Token: ERC__Token,
		ERC__Transfer: ERC__Transfer,
	},
}
export const schema: PonziLandSchemaType = {
	ponzi_land: {
		LandValue: {
			fieldOrder: ['block_date_bought', 'owner', 'sell_price', 'token_used', 'pool_key'],
			block_date_bought: 0,
			owner: "",
			sell_price: 0,
			token_used: "",
			pool_key: "",
		},
		Land: {
			fieldOrder: ['location', 'block_date_bought', 'owner', 'sell_price', 'token_used', 'pool_key'],
			location: 0,
			block_date_bought: 0,
			owner: "",
			sell_price: 0,
			token_used: "",
			pool_key: "",
		},
		ERC__Balance: {
			fieldOrder: ['balance', 'type', 'tokenmetadata'],
			balance: '',
			type: 'ERC20',
			tokenMetadata: {
				fieldOrder: ['name', 'symbol', 'tokenId', 'decimals', 'contractAddress'],
				name: '',
				symbol: '',
				tokenId: '',
				decimals: '',
				contractAddress: '',
			},
		},
		ERC__Token: {
			fieldOrder: ['name', 'symbol', 'tokenId', 'decimals', 'contractAddress'],
			name: '',
			symbol: '',
			tokenId: '',
			decimals: '',
			contractAddress: '',
		},
		ERC__Transfer: {
			fieldOrder: ['from', 'to', 'amount', 'type', 'executed', 'tokenMetadata'],
			from: '',
			to: '',
			amount: '',
			type: 'ERC20',
			executedAt: '',
			tokenMetadata: {
				fieldOrder: ['name', 'symbol', 'tokenId', 'decimals', 'contractAddress'],
				name: '',
				symbol: '',
				tokenId: '',
				decimals: '',
				contractAddress: '',
			},
			transactionHash: '',
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