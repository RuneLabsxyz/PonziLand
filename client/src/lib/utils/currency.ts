import type { Token } from '$lib/interfaces';
import BigNumber from 'bignumber.js';
import type { BigNumberish } from 'starknet';

// Ensure we don't get the exponential notion
BigNumber.config({ EXPONENTIAL_AT: [-20, 20] });

// To understand this library, there is two versions of an amount in a ERC-20 token:
// The Raw version, that is an integer.
// The display version, that is an arbitrary precision number, with the amount of decimals decided by the token (see the decimals() view function)

export function fromCallData(
  rawAmount: BigNumberish,
  scale: number,
): BigNumber {
  return new BigNumber(rawAmount.toString()).shiftedBy(-scale);
}

export function toCalldata(
  displayAmount: BigNumber | string,
  scale: number = 18,
): BigNumber {
  if (typeof displayAmount == 'string') {
    displayAmount = new BigNumber(displayAmount);
  }

  return displayAmount.shiftedBy(scale);
}

/**
 * Format a numeric input into a human-readable currency string with suffixes:
 * - B for Billion
 * - M for Million
 * - K for Thousand
 * - Preserves small decimals with optional zero tail hint
 *
 * @param value - The number to format (string | number | BigNumber)
 * @returns Formatted currency string
 */
export function displayCurrency(value: string | number | BigNumber): string {
  const bn = new BigNumber(value);
  const abs = bn.abs();

  let suffix = '';
  let formatted: string;

  if (abs.isGreaterThanOrEqualTo(1_000_000_000)) {
    formatted = bn.dividedBy(1_000_000_000).toFormat(2);
    suffix = 'B';
  } else if (abs.isGreaterThanOrEqualTo(1_000_000)) {
    formatted = bn.dividedBy(1_000_000).toFormat(2);
    suffix = 'M';
  } else if (abs.isGreaterThanOrEqualTo(1_000)) {
    formatted = bn.dividedBy(1_000).toFormat(2);
    suffix = 'K';
  } else if (abs.isGreaterThanOrEqualTo(1)) {
    formatted = bn.toFormat(2);
  } else {
    // Very small number < 1 — show full precision
    formatted = bn.toFixed(20);

    const decimalStr = formatted.split('.')[1] ?? '';
    const leadingZeros = decimalStr.match(/^0*/)?.[0].length ?? 0;

    if (leadingZeros >= 3) {
      formatted += ` (0.${'0'.repeat(leadingZeros)}…)`;
    }
  }

  return formatted + suffix;
}
