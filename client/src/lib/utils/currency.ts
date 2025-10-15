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

  // Use BigNumber's precision method for proper rounding
  const rounded = bn.precision(significantDigits, BigNumber.ROUND_HALF_UP);

  // Convert to fixed decimal notation to avoid exponential
  // Calculate how many decimal places we need
  const abs = rounded.abs();
  let decimalPlaces = 0;

  if (abs.isLessThan(1)) {
    // For numbers < 1, we need enough decimal places to show the significant digits
    const str = abs.toString();
    const decimalIndex = str.indexOf('.');
    if (decimalIndex !== -1) {
      // Count leading zeros after decimal point
      let leadingZeros = 0;
      for (let i = decimalIndex + 1; i < str.length; i++) {
        if (str[i] === '0') {
          leadingZeros++;
        } else {
          break;
        }
      }
      // Need enough places for leading zeros + significant digits
      decimalPlaces = leadingZeros + significantDigits;
    }
  } else {
    // For numbers >= 1, use a reasonable number of decimal places
    decimalPlaces = Math.max(
      0,
      significantDigits - rounded.integerValue().toString().length,
    );
  }

  // Use toFixed to get the decimal representation, then remove trailing zeros
  let result = rounded.toFixed(Math.min(decimalPlaces, 20));

  // Remove trailing zeros and unnecessary decimal point
  result = result.replace(/\.?0+$/, '');

  return result;
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
    suffix = ' B';
  } else if (abs.isGreaterThanOrEqualTo(1_000_000)) {
    formatted = bn.dividedBy(1_000_000).toFormat(2);
    suffix = ' M';
  } else if (abs.isGreaterThanOrEqualTo(1_000)) {
    formatted = bn.dividedBy(1_000).toFormat(2);
    suffix = ' K';
  } else if (abs.isGreaterThanOrEqualTo(1)) {
    formatted = bn.toFormat(2);
  } else {
    // Very small number < 1 — use formatWithoutExponential to avoid exponential notation
    formatted = formatWithoutExponential(bn, 3);
  }

  return formatted + suffix;
}
