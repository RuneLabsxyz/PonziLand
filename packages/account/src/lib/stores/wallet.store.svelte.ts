// Wallet store combines the functionnality of all the elements available in this package into
// one simple API.
// It also makes the transition between the previous API simpler, as it exposes the same functions

import { CurrencyAmount } from '$lib/currency/currencyAmount.js';
import type { Token } from '$lib/types.js';
import type { SDK } from '@dojoengine/sdk';
import { DojoBalanceProvider } from './balance-providers/dojoBalanceProvider.js';
import RpcBalanceProvider from './balance-providers/rpcBalanceProvider.js';
import { Provider } from 'starknet';
import { getTokens } from '$lib/ponziland-api/tokens.js';
import { SvelteMap } from 'svelte/reactivity';
import { computeTotalBalance } from '../utils/computeTotalBalance.js';
import { ApiTokenPriceConverter, type TokenPriceConverter } from './tokenPriceConverter.js';
import type { BalanceProvider } from './balance-providers/balanceProvider.js';

// But provides more readable code (previous impl was 425 lines long)
export class WalletStore {
	private dojoSdk?: SDK<never>;
	private provider?: Provider;
	private apiUrl: string;
	private baseToken?: Token;

	private tokens: Token[];

	private fallbackBalanceProvider?: BalanceProvider;
	private dojoBalanceProvider?: DojoBalanceProvider;
	private tokenPriceConverter: TokenPriceConverter;

	private balances = $state(new SvelteMap<string, CurrencyAmount>());
	private totalBalance: CurrencyAmount;

	constructor(
		options:
			| {
					provider: Provider;
					dojoSdk?: SDK<never>;
					tokens?: Token[];
					apiUrl: string;
					baseToken?: Token;
			  }
			| {
					provider: BalanceProvider;
					tokenPrice: TokenPriceConverter;
					tokens: Token[];
					baseToken?: Token;
			  }
	) {
		this.totalBalance = $state(CurrencyAmount.fromScaled(0, options.baseToken));

		if ('tokenPrice' in options) {
			this.provider = undefined;
			this.tokens = options.tokens;
			this.baseToken = options.baseToken;
			this.apiUrl = '';

			this.fallbackBalanceProvider = options.provider;
			this.tokenPriceConverter = options.tokenPrice;

			return;
		}
		// Standard constructor
		this.provider = options.provider;
		this.dojoSdk = options.dojoSdk;
		this.apiUrl = options.apiUrl;
		this.baseToken = options.baseToken;
		this.tokenPriceConverter = new ApiTokenPriceConverter(options.apiUrl);

		// We consider that the tokens should require a refresh to be shown:
		if (options.tokens == undefined || options.tokens.length == 0) {
			this.tokens = [];
		} else {
			this.tokens = options.tokens;
		}
	}

	public async init(): Promise<void> {
		// Fetch the tokens if a list wasn't provided:
		if (!this.tokens.length) {
			this.tokens = await getTokens(this.apiUrl);
		}

		await this.update();
	}

	/**
	 * Updates the balances.
	 */
	public async update(): Promise<void> {
		try {
			// In parallel, wait for the balances to updates, and gets the updated token prices
			await Promise.all([this.updateBalances(), this.tokenPriceConverter.update()]);

			// Once we have the balances, we can update the base token balance
			this.totalBalance = computeTotalBalance(
				this.tokenPriceConverter,
				this.balances,
				this.baseToken!
			);
		} catch (error) {
			console.error('Error updating balances:', error);
		}
	}

	public optimisticallySetBalance(tokenAddress: string, balance: CurrencyAmount): void {
		this.balances.set(tokenAddress, balance);
		this.totalBalance = computeTotalBalance(
			this.tokenPriceConverter,
			this.balances,
			this.baseToken!
		);
	}

	public async setAddress(address: string): Promise<void> {
		// Do not update provider if we use testing setup
		if (this.provider) {
			this.fallbackBalanceProvider = new RpcBalanceProvider(this.provider, address);
		}

		if (this.dojoSdk) {
			this.dojoBalanceProvider = new DojoBalanceProvider(this.dojoSdk, address, this.tokens);
		}
	}

	public async setBaseToken(baseToken: Token): Promise<void> {
		this.baseToken = baseToken;
		// Force update balances to reflect the new base token
		await this.update();
	}

	public getBalance(tokenAddress: string): CurrencyAmount | null {
		return this.balances.get(tokenAddress) || null;
	}

	public getTotalBalance(): CurrencyAmount | null {
		return this.totalBalance;
	}

	public getToken(tokenAddress: string): Token | null {
		return this.tokens.find((token) => token.address === tokenAddress) || null;
	}

	public destroy(): void {
		this.dojoBalanceProvider?.destroy();
	}

	// ---- Private section

	private async updateBalances(): Promise<void> {
		for (const token of this.tokens) {
			const balance = await this.fetchTokenBalance(token);
			this.balances.set(token.address, balance ?? CurrencyAmount.fromScaled(0, token));
		}
	}

	private async fetchTokenBalance(token: Token): Promise<CurrencyAmount | null> {
		if (this.dojoBalanceProvider) {
			try {
				return await this.dojoBalanceProvider.getBalance(token);
			} catch (_error: unknown) {
				// No need to log the error here, as it can happen if the token is unknown, or not indexed.
				// Just fall back to the RPC provider
			}
		}
		return await this.fallbackBalanceProvider!.getBalance(token);
	}
}
