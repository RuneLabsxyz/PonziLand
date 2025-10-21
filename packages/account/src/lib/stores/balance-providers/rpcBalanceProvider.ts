import type { Provider } from 'starknet';
import type { BalanceProvider } from './balanceProvider.js';
import type { Token } from '$lib/types.js';
import { CurrencyAmount } from '$lib/currency/currencyAmount.js';
import { fetchTokenBalance } from '$lib/utils/balances.js';

export default class RpcBalanceProvider implements BalanceProvider {
	// Reminder that this class fetches balance from an RPC endpoint on the fly.
	// If a token is never requested, it will not be fetched.

	private readonly provider: Provider;
	private readonly address: string;

	private _balanceCache: Map<string, CurrencyAmount> = new Map();

	public constructor(provider: Provider, address: string) {
		this.provider = provider;
		this.address = address;
	}

	public registerTokens(..._tokens: Token[]): void {
		// No-OP, as recommended in the implementation
	}

	public async forceUpdate(): Promise<void> {
		this._balanceCache = new Map();
	}

	public async getBalance(token: Token): Promise<CurrencyAmount> {
		if (this._balanceCache.has(token.address)) {
			return this._balanceCache.get(token.address)!;
		}

		const balance = await fetchTokenBalance(token.address, this.address, this.provider);

		if (balance === null) {
			throw new Error(`Failed to fetch balance for token ${token.address}.`);
		}

		const amount = CurrencyAmount.fromUnscaled(balance, token);
		this._balanceCache.set(token.address, amount);

		return amount;
	}
}
