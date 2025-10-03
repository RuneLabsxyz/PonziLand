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
/**
 * Format a number by cutting decimal places to a specific number of significant digits without using exponential notation
 * @param value - The number to format (string | number | BigNumber)
 * @param significantDigits - Number of significant digits to show in decimal part (default: 6)
 * @returns Formatted number string without exponentials
 */
export function formatWithoutExponential(
  value: string | number | BigNumber,
  significantDigits: number = 6,
): string {
  const bn = new BigNumber(value);

  // Special case for zero
  if (bn.isZero()) {
    return '0';
  }

  // Convert to string with high precision to work with
  const str = bn.toFixed(20);
  const isNegative = str.startsWith('-');
  const absStr = isNegative ? str.substring(1) : str;

  // Split into integer and decimal parts
  const [integerPart, decimalPart = ''] = absStr.split('.');

  let result = integerPart;

  // If there's a decimal part, process it
  if (decimalPart) {
    result += '.';

    let significantFound = 0;
    let foundFirstNonZero = false;

    for (
      let i = 0;
      i < decimalPart.length && significantFound < significantDigits;
      i++
    ) {
      const digit = decimalPart[i];
      result += digit;

      // Once we find the first non-zero digit, all subsequent digits (including zeros) are significant
      if (digit !== '0') {
        foundFirstNonZero = true;
      }

      // Count as significant if we've found our first non-zero digit
      if (foundFirstNonZero) {
        significantFound++;
      }
    }

    // Remove trailing zeros only if we haven't used all significant digits
    if (significantFound < significantDigits) {
      result = result.replace(/\.?0+$/, '');
    }
  }

  return isNegative ? '-' + result : result;
}

export function displayCurrency(value: string | number | BigNumber): string {
  const bn = new BigNumber(value);
  const abs = bn.abs();

  // Special case for zero
  if (bn.isZero()) {
    return '0';
  }

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
    // Very small number < 1 — use subexponent formatting for very small numbers
    formatted = bn.toFixed(20);

    const decimalStr = formatted.split('.')[1] ?? '';
    const leadingZeros = decimalStr.match(/^0*/)?.[0].length ?? 0;

    // If there are more than 4 leading zeros, use exponential notation to save space
    if (leadingZeros > 4) {
      // Use exponential notation with 3 significant digits
      formatted = bn.toExponential(2);
    } else {
      // Calculate the number of significant digits to show (at least 3, but at most 6 for readability)
      const significantDigits = Math.min(Math.max(3, leadingZeros + 3), 6);
      formatted = bn.toFixed(significantDigits);
    }
  }

  return formatted + suffix;
}
