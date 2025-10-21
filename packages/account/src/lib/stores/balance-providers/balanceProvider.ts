import type { Token } from '$lib/types.js';
import type { CurrencyAmount } from '$lib/currency/currencyAmount.js';

/**
 * BalanceProvider is an interface that provides the balance for a set account.
 *
 * Some remarks for the implementation:
 * - The address SHOULD be provided as a constructor parameter
 * - Users of this interface SHOULD recreate new balance provider instances when the address to track
 *   changes
 */
export interface BalanceProvider {
	/**
	 * Registers tokens to be tracked by the balance provider.
	 *
	 * Note: Implementors can no-op this method if it is more efficient to fetch the information
	 * on the fly.
	 *
	 * @param tokens The tokens to register.
	 */
	registerTokens(...tokens: Token[]): void;

	/**
	 * Forces an update of the balance provider's data.
	 *
	 * Note: Implementors can choose to not update the data, but instead invalidate the cache when
	 * this function is called, if on-the-fly fetching is not supported.
	 * @returns A promise that resolves when the update is complete.
	 */
	forceUpdate(): Promise<void>;

	/**
	 * Fetches the balance for a given token.
	 *
	 * Note: The token MUST be registered before calling this method,
	 * and implementations SHOULD throw an error if the token is not registered.
	 *
	 * For on-the-fly fetching, implementations SHOULD throw an error if the value could not be fetched.
	 *
	 * @param token The token to fetch the balance for.
	 * @returns A promise that resolves with the balance.
	 */
	getBalance(token: Token): Promise<CurrencyAmount>;
}
