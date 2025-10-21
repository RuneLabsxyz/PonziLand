import { CurrencyAmount } from '../currency/currencyAmount.js';

export interface TokenPrice {
	symbol: string;
	address: string;
	ratio: CurrencyAmount;
	best_pool?: PoolKey;
}

export interface PoolKey {
	token0: string;
	token1: string;
	fee: number;
	tick_spacing: number;
	extension: string;
}

interface ApiResponse {
	symbol: string;
	address: string;
	ratio: number;
	ratio_exact: string;
	best_pool?: PoolKey;
}

export async function getTokenPrices(url: string): Promise<TokenPrice[]> {
	try {
		const res = await fetch(url + '/price');
		if (!res.ok) {
			throw new Error('Network response was not ok');
		}
		const data = (await res.json()) as ApiResponse[];

		// Convert API format to new format with CurrencyAmount
		return data.map((item) => ({
			symbol: item.symbol,
			address: item.address,
			ratio: CurrencyAmount.fromScaled(item.ratio_exact),
			best_pool: item.best_pool
		}));
	} catch (error) {
		console.error('Error fetching token prices:', error);
		throw error;
	}
}
