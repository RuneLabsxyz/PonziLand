import type { Token } from '$lib/interfaces';
import { walletStore } from '$lib/stores/wallet.svelte';
import { padAddress } from '$lib/utils';
import type { CurrencyAmount } from '$lib/utils/CurrencyAmount';

/**
 * Finds the token with the highest dollar value in the user's wallet,
 * excluding a specified token (typically the token needed for the purchase).
 *
 * @param excludeTokenAddress - Token address to exclude from consideration
 * @returns The token with highest value, or undefined if no suitable token found
 */
export function findBestSourceToken(
  excludeTokenAddress?: string,
): Token | undefined {
  const tokenBalances = walletStore.tokenBalances;

  if (!tokenBalances || tokenBalances.length === 0) {
    return undefined;
  }

  let bestToken: Token | undefined;
  let highestValue: CurrencyAmount | null = null;

  for (const [token, balance] of tokenBalances) {
    // Skip the excluded token (the one we need to buy)
    if (
      excludeTokenAddress &&
      padAddress(token.address) === padAddress(excludeTokenAddress)
    ) {
      continue;
    }

    // Skip tokens with zero balance
    if (balance.rawValue().isZero()) {
      continue;
    }

    // Get the dollar-equivalent value
    const dollarValue = walletStore.getCachedBaseTokenEquivalent(token.address);

    if (!dollarValue) continue;

    // Compare with current best
    if (!highestValue || dollarValue.rawValue().gt(highestValue.rawValue())) {
      highestValue = dollarValue;
      bestToken = token;
    }
  }

  return bestToken;
}

/**
 * Calculates the deficit amount plus a buffer for slippage.
 *
 * @param required - The required amount
 * @param available - The available balance
 * @param bufferPercent - Buffer percentage (default 5%)
 * @returns The deficit amount with buffer as a string, or null if no deficit
 */
export function calculateDeficitWithBuffer(
  required: CurrencyAmount,
  available: CurrencyAmount | null,
  bufferPercent: number = 5,
): string | null {
  const requiredRaw = required.rawValue();

  if (!available || available.rawValue().isZero()) {
    // User has none of the token, need the full amount plus buffer
    const bufferedAmount = requiredRaw.times(1 + bufferPercent / 100);
    return bufferedAmount.toString();
  }

  const availableRaw = available.rawValue();

  // If user has enough, no deficit
  if (availableRaw.gte(requiredRaw)) {
    return null;
  }

  // Calculate deficit: (required - available) * (1 + buffer%)
  const deficit = requiredRaw.minus(availableRaw);
  const deficitWithBuffer = deficit.times(1 + bufferPercent / 100);

  return deficitWithBuffer.toString();
}
