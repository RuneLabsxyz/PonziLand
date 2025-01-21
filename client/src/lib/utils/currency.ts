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
  return new BigNumber(rawAmount.toString()).dividedBy(
    new BigNumber(10).pow(scale),
  );
}

export function toCalldata(displayAmount: BigNumber, scale: number): bigint {
  return BigInt(
    displayAmount.multipliedBy(new BigNumber(10).pow(scale)).toFixed(),
  );
}

export function displayCurrency(
  number: BigNumber | null,
  scale: number = 0,
): string {
  if (number == null) {
    return 'N/A';
  }

  const bn = number.dividedBy(new BigNumber(10).pow(scale));
  console.log('BN:', bn.toString());

  const negative = bn.isNegative();
  const absVal = bn.abs();

  // 1) If it's exactly 0, just return "0":
  if (absVal.isZero()) {
    return '0';
  }

  // 2) If >= 1, show integer part fully + up to 2 decimal places:
  if (absVal.isGreaterThanOrEqualTo(1)) {
    // Force exactly two decimals, then strip trailing ".00" if present:
    let str = absVal.toFixed(2); // e.g. "123.00", "123.45"

    if (str.endsWith('.00')) {
      console.log('We got a doubleo');
      str = str.slice(0, -3); // drop the .00
    }

    return negative ? '-' + str : str;
  }

  // 3) If 0 < amount < 1, show two significant digits with all leading zeros:
  //    e.g. 0.000321 => "0.00032" (standard rounding: 3.21e-4 → 3.2e-4)
  //         0.000326 => "0.00033"
  const twoSig = absVal.toPrecision(2); // might produce scientific notation, e.g. "3.2e-4"
  // Convert the (possibly scientific) string back into normal decimal notation:
  const normalStr = new BigNumber(twoSig).toString(); // e.g. "0.00032"

  return negative ? '-' + normalStr : normalStr;
}
