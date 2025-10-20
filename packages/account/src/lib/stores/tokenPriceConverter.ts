import { getTokenPrices } from '$lib/ponziland-api/price.js';
import type { Token } from '$lib/types.js';
import { CurrencyAmount, padAddress } from '$lib/index.js';

export interface TokenPriceConverter {
	update(): Promise<void>;

	getRatio(address: string): CurrencyAmount | undefined;
	convertTokenAmount(fromAmount: CurrencyAmount, fromToken: Token, toToken: Token): CurrencyAmount;
}

// Some insights on the responsibility of this class:
// - Fetches the token prices
// - Keeps it in cache
// - Offers the data as derived values, so that they can auto-update when price changes
export class ApiTokenPriceConverter implements TokenPriceConverter {
	private apiUrl: string;
	// Token ratios in relation to the base currency (defined by search)
	private tokenRatios: Map<string, CurrencyAmount> = new Map();

	constructor(apiUrl: string) {
		this.apiUrl = apiUrl;
	}

	public async update() {
		const tokenPrices = await getTokenPrices(this.apiUrl);
		// With those, we need to find the reference token (the only one with an exact 1 as the value)
		const referencePrice = tokenPrices.find((price) => price.ratio.rawValue().eq(1));
		if (!referencePrice) {
			throw new Error('No reference token found');
		}

		for (const price of tokenPrices) {
			this.tokenRatios.set(price.address, price.ratio);
		}
	}

	public getRatio(address: string) {
		return this.tokenRatios.get(padAddress(address));
	}

	public convertTokenAmount(
		fromAmount: CurrencyAmount,
		fromToken: Token,
		toToken: Token
	): CurrencyAmount {
		if (!fromToken || !toToken) throw new Error('Invalid token');

		if (fromToken.address === toToken.address) {
			return fromAmount;
		}

		const fromPrice = this.tokenRatios.get(fromToken.address);
		const toPrice = this.tokenRatios.get(toToken.address);

		if (!fromPrice || !toPrice) {
			throw new Error(
				`Token price not found (${fromToken.address}, ${toToken.address}): ${fromPrice == null}, ${toPrice == null}`
			);
		}

		// Convert fromAmount to base currency, then to target token
		const baseValue = fromAmount.rawValue().dividedBy(fromPrice.rawValue());

		if (!baseValue.isFinite()) {
			throw new Error('Invalid conversion');
		}

		const convertedValue = baseValue.multipliedBy(toPrice.rawValue());

		return CurrencyAmount.fromRaw(convertedValue, toToken);
	}
}
