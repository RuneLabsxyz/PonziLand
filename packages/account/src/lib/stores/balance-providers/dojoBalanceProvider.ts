import type { Token } from '$lib/types.js';
import type { CurrencyAmount } from '$lib/currency/currencyAmount.js';
import { CurrencyAmount as CurrencyAmountImpl } from '$lib/currency/currencyAmount.js';
import type { BalanceProvider } from './balanceProvider.js';
import type { SDK } from '@dojoengine/sdk';
import type { Subscription, TokenBalance } from '@dojoengine/torii-client';

export class DojoBalanceProvider implements BalanceProvider {
	private registeredTokens = new Map<string, Token>();
	private balances = new Map<string, CurrencyAmount>();
	private subscription: Subscription | null = null;
	private readonly address: string;
	private readonly sdk: SDK<never>;

	constructor(sdk: SDK<never>, address: string, tokens: Token[]) {
		this.address = address;
		this.registerTokens(...tokens);
		this.sdk = sdk;
	}

	registerTokens(...tokens: Token[]): void {
		for (const token of tokens) {
			this.registeredTokens.set(token.address, token);
		}
	}

	async forceUpdate(): Promise<void> {
		if (this.registeredTokens.size === 0) {
			return;
		}

		// Cancel existing subscription if any
		if (this.subscription) {
			this.subscription.cancel();
			this.subscription = null;
		}

		try {
			const contractAddresses = Array.from(this.registeredTokens.keys());

			const [tokenBalances, subscription] = await this.sdk.subscribeTokenBalance({
				contractAddresses,
				accountAddresses: [this.address],
				tokenIds: [],
				callback: ({ data, error }) => {
					if (data) {
						this.updateTokenBalance(data);
					}
					if (error) {
						console.error('Error while getting balance:', error);
					}
				}
			});

			this.subscription = subscription;

			// Process initial balances
			if (tokenBalances?.items) {
				for (const item of tokenBalances.items) {
					this.updateTokenBalance(item);
				}
			}
		} catch (error) {
			console.error('Failed to update balances:', error);
			throw error;
		}
	}

	async getBalance(token: Token): Promise<CurrencyAmount> {
		if (!this.registeredTokens.has(token.address)) {
			throw new Error(`Token ${token.address} is not registered`);
		}

		const cachedBalance = this.balances.get(token.address);
		if (cachedBalance) {
			return cachedBalance;
		}

		// If no cached balance and token is registered, return error
		// The subscription should have provided the balance if available
		throw new Error(`Balance not available for token ${token.address}`);
	}

	private updateTokenBalance(item: TokenBalance): void {
		try {
			if (!item || !item.contract_address || item.balance === undefined) {
				return;
			}

			// Only update if this token is registered
			const token = this.registeredTokens.get(item.contract_address);
			if (!token) {
				return;
			}

			const balance = BigInt(item.balance);
			const currencyAmount = CurrencyAmountImpl.fromUnscaled(balance, token);

			this.balances.set(token.address, currencyAmount);
		} catch (error) {
			console.error('Error updating token balance:', error);
		}
	}

	destroy(): void {
		if (this.subscription) {
			this.subscription.cancel();
			this.subscription = null;
		}
		this.balances.clear();
		this.registeredTokens.clear();
	}
}
