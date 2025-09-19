import BigNumber from 'bignumber.js';
import { type BigNumberish } from 'starknet';
import { displayCurrency, fromCallData, toCalldata } from './currency';

export interface Token {
  name: string;
  symbol: string;
  address: string;
  liquidityPoolType: string;
  decimals: number;
  images: {
    skin: string;
    icon: string;
  };
}

export class CurrencyAmount {
  // We store the bignumber as scaled (the amount as would be shown to the user, not the opposite)
  private value: BigNumber;
  private token?: Token;

  private constructor(val: BigNumber, token?: Token) {
    this.value = val;

    this.token = token;
  }

  /**
   * Create a CurrencyAmount from the unscaled amount (the one procided by the contract)
   * @param amount The unscaled amount
   * @param token The token used for this amount
   * @returns A new instance of CurrencyAmount
   */
  static fromUnscaled(amount: BigNumberish, token?: Token): CurrencyAmount {
    return new CurrencyAmount(
      fromCallData(amount, token?.decimals ?? 18),
      token,
    );
  }

  /**
   * Creates a CurrencyAmount from an already scaled amount (for example user input)
   * @param amount The scaled amount
   * @param token The token used for this amount
   * @returns A new instance of CurrencyAmount, reflecting the inputs
   */
  static fromScaled(amount: BigNumberish, token?: Token): CurrencyAmount {
    // Truncate to the number of available decimals
    const truncated = new BigNumber(amount.toString()).decimalPlaces(
      token?.decimals ?? 18,
      BigNumber.ROUND_FLOOR,
    );
    return new CurrencyAmount(truncated, token);
  }

  static fromRaw(rawValue: BigNumber, token?: Token): CurrencyAmount {
    return new CurrencyAmount(rawValue, token);
  }

  public rawValue(): BigNumber {
    return this.value;
  }

  public getToken(): Token | undefined {
    return this.token;
  }

  public setToken(token?: Token) {
    this.token = token;
  }

  public add(other: CurrencyAmount) {
    if (this.token && other.token && this.token !== other.token) {
      throw 'Incompatible currencies!';
    }

    return CurrencyAmount.fromRaw(this.rawValue().plus(other.rawValue()));
  }

  /**
   * Displays an human-friendly representation of the CurrencyAmount
   * @returns A human-readable string representing the CurrencyAmount
   */
  public toString(): string {
    return displayCurrency(this.value); // The scale is 0 because the array is correcly indicated
  }

  /**
   * Converts the CurrencyAmount to a BigNumberish, so that it can be used to in contract calls
   * @returns Scaled BigNumberish (multiplied by 10 ** nbDecimals)
   */
  public toBignumberish(): BigNumberish {
    return this.toBigint();
  }

  public isZero(): boolean {
    return this.value.isZero();
  }

  public toBigint(): bigint {
    return BigInt(this.value.shiftedBy(this.token?.decimals ?? 18).toFixed(0));
  }
}
