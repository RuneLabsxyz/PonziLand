import { CurrencyAmount } from '$lib/currency/currencyAmount.js';
import type { Token } from '$lib/types.js';
import type { TokenPriceConverter } from '../stores/tokenPriceConverter.js';

export function computeTotalBalance(
	tokenConverter: TokenPriceConverter,
	balances: Map<string, CurrencyAmount>,
	toToken: Token
): CurrencyAmount {
	let totalBalance = CurrencyAmount.fromScaled(0, toToken);

	for (const [tokenAddr, balance] of balances.entries()) {
		if (balance.getToken()?.address != tokenAddr) {
			throw new Error(
				`Token address mismatch (or token unset): ${tokenAddr} != ${balance.getToken()?.address}`
			);
		}
		// Convert the amount, and then add it to the total balance
		const convertedAmount = tokenConverter.convertTokenAmount(
			balance,
			balance.getToken()!,
			toToken
		);

		if (convertedAmount == undefined) {
			throw new Error(`Failed to convert token amount for ${tokenAddr}`);
		}

		totalBalance = totalBalance.add(convertedAmount);
	}

	return totalBalance;
}
