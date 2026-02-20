import { describe, expect, it } from 'vitest';
import { CurrencyAmount } from './CurrencyAmount';
import BigNumber from 'bignumber.js';
import type { Token } from '$lib/interfaces';

// Helper to create a mock token
function mockToken(overrides: Partial<Token> = {}): Token {
  return {
    name: 'Ethereum',
    symbol: 'ETH',
    address:
      '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
    liquidityPoolType: 'ekubo',
    decimals: 18,
    skin: 'eth',
    ...overrides,
  };
}

describe('CurrencyAmount', () => {
  const ethToken = mockToken();
  const usdcToken = mockToken({
    name: 'USD Coin',
    symbol: 'USDC',
    address:
      '0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8',
    decimals: 6,
  });

  describe('fromUnscaled', () => {
    it('should create from a raw contract value with 18 decimals', () => {
      const amount = CurrencyAmount.fromUnscaled(
        '1000000000000000000',
        ethToken,
      );
      expect(amount.rawValue().toNumber()).toBe(1);
    });

    it('should create from a raw contract value with 6 decimals', () => {
      const amount = CurrencyAmount.fromUnscaled('1000000', usdcToken);
      expect(amount.rawValue().toNumber()).toBe(1);
    });

    it('should handle zero', () => {
      const amount = CurrencyAmount.fromUnscaled('0', ethToken);
      expect(amount.rawValue().toNumber()).toBe(0);
      expect(amount.isZero()).toBe(true);
    });

    it('should handle large values', () => {
      const amount = CurrencyAmount.fromUnscaled(
        '100000000000000000000',
        ethToken,
      ); // 100 ETH
      expect(amount.rawValue().toNumber()).toBe(100);
    });

    it('should handle fractional values', () => {
      const amount = CurrencyAmount.fromUnscaled(
        '500000000000000000',
        ethToken,
      ); // 0.5 ETH
      expect(amount.rawValue().toNumber()).toBe(0.5);
    });

    it('should default to 18 decimals when no token provided', () => {
      const amount = CurrencyAmount.fromUnscaled('1000000000000000000');
      expect(amount.rawValue().toNumber()).toBe(1);
    });

    it('should handle bigint input', () => {
      const amount = CurrencyAmount.fromUnscaled(
        BigInt('1000000000000000000'),
        ethToken,
      );
      expect(amount.rawValue().toNumber()).toBe(1);
    });
  });

  describe('fromScaled', () => {
    it('should create from a user-friendly amount', () => {
      const amount = CurrencyAmount.fromScaled('1.5', ethToken);
      expect(amount.rawValue().toNumber()).toBe(1.5);
    });

    it('should truncate excess decimals', () => {
      const amount = CurrencyAmount.fromScaled('1.1234567', usdcToken);
      // USDC has 6 decimals, should truncate to 1.123456
      expect(amount.rawValue().toNumber()).toBe(1.123456);
    });

    it('should handle integer input', () => {
      const amount = CurrencyAmount.fromScaled('100', ethToken);
      expect(amount.rawValue().toNumber()).toBe(100);
    });

    it('should handle zero', () => {
      const amount = CurrencyAmount.fromScaled('0', ethToken);
      expect(amount.isZero()).toBe(true);
    });

    it('should use floor rounding for truncation', () => {
      const amount = CurrencyAmount.fromScaled('1.9999999', usdcToken);
      expect(amount.rawValue().toNumber()).toBe(1.999999);
    });
  });

  describe('fromRaw', () => {
    it('should create from a BigNumber directly', () => {
      const bn = new BigNumber('3.14');
      const amount = CurrencyAmount.fromRaw(bn, ethToken);
      expect(amount.rawValue()).toBe(bn);
    });
  });

  describe('arithmetic operations', () => {
    it('should add two amounts with the same token', () => {
      const a = CurrencyAmount.fromScaled('1.5', ethToken);
      const b = CurrencyAmount.fromScaled('2.5', ethToken);
      const result = a.add(b);
      expect(result.rawValue().toNumber()).toBe(4);
    });

    it('should subtract two amounts with the same token', () => {
      const a = CurrencyAmount.fromScaled('5', ethToken);
      const b = CurrencyAmount.fromScaled('2', ethToken);
      const result = a.subtract(b);
      expect(result.rawValue().toNumber()).toBe(3);
    });

    it('should allow negative results from subtraction', () => {
      const a = CurrencyAmount.fromScaled('1', ethToken);
      const b = CurrencyAmount.fromScaled('3', ethToken);
      const result = a.subtract(b);
      expect(result.rawValue().toNumber()).toBe(-2);
    });

    it('should throw when adding incompatible tokens', () => {
      const a = CurrencyAmount.fromScaled('1', ethToken);
      const b = CurrencyAmount.fromScaled('1', usdcToken);
      expect(() => a.add(b)).toThrow('Incompatible currencies!');
    });

    it('should throw when subtracting incompatible tokens', () => {
      const a = CurrencyAmount.fromScaled('1', ethToken);
      const b = CurrencyAmount.fromScaled('1', usdcToken);
      expect(() => a.subtract(b)).toThrow('Incompatible currencies!');
    });

    it('should allow adding when one operand has no token', () => {
      const a = CurrencyAmount.fromScaled('1', ethToken);
      const b = CurrencyAmount.fromScaled('2');
      const result = a.add(b);
      expect(result.rawValue().toNumber()).toBe(3);
      expect(result.getToken()).toBe(ethToken);
    });

    it('should preserve token from other operand if this has none', () => {
      const a = CurrencyAmount.fromScaled('1');
      const b = CurrencyAmount.fromScaled('2', ethToken);
      const result = a.add(b);
      expect(result.rawValue().toNumber()).toBe(3);
      expect(result.getToken()).toBe(ethToken);
    });
  });

  describe('toBigint', () => {
    it('should convert back to raw contract value (18 decimals)', () => {
      const amount = CurrencyAmount.fromScaled('1', ethToken);
      expect(amount.toBigint()).toBe(BigInt('1000000000000000000'));
    });

    it('should convert back to raw contract value (6 decimals)', () => {
      const amount = CurrencyAmount.fromScaled('1', usdcToken);
      expect(amount.toBigint()).toBe(BigInt('1000000'));
    });

    it('should handle fractional amounts', () => {
      const amount = CurrencyAmount.fromScaled('0.5', ethToken);
      expect(amount.toBigint()).toBe(BigInt('500000000000000000'));
    });

    it('should handle zero', () => {
      const amount = CurrencyAmount.fromScaled('0', ethToken);
      expect(amount.toBigint()).toBe(0n);
    });

    it('should roundtrip: fromUnscaled -> toBigint', () => {
      const raw = '1234567890123456789';
      const amount = CurrencyAmount.fromUnscaled(raw, ethToken);
      expect(amount.toBigint()).toBe(BigInt(raw));
    });

    it('should roundtrip with USDC', () => {
      const raw = '1234567';
      const amount = CurrencyAmount.fromUnscaled(raw, usdcToken);
      expect(amount.toBigint()).toBe(BigInt(raw));
    });
  });

  describe('isZero', () => {
    it('should return true for zero amount', () => {
      const amount = CurrencyAmount.fromScaled('0', ethToken);
      expect(amount.isZero()).toBe(true);
    });

    it('should return false for non-zero amount', () => {
      const amount = CurrencyAmount.fromScaled('0.001', ethToken);
      expect(amount.isZero()).toBe(false);
    });
  });

  describe('getToken / setToken', () => {
    it('should return the token', () => {
      const amount = CurrencyAmount.fromScaled('1', ethToken);
      expect(amount.getToken()).toBe(ethToken);
    });

    it('should return undefined when no token', () => {
      const amount = CurrencyAmount.fromScaled('1');
      expect(amount.getToken()).toBeUndefined();
    });

    it('should update the token via setToken', () => {
      const amount = CurrencyAmount.fromScaled('1', ethToken);
      amount.setToken(usdcToken);
      expect(amount.getToken()).toBe(usdcToken);
    });
  });

  describe('toString', () => {
    it('should format a simple amount', () => {
      const amount = CurrencyAmount.fromScaled('1000', ethToken);
      expect(amount.toString()).toBe('1.00 K');
    });

    it('should format zero', () => {
      const amount = CurrencyAmount.fromScaled('0', ethToken);
      expect(amount.toString()).toBe('0');
    });
  });

  describe('toBignumberish', () => {
    it('should return the same as toBigint', () => {
      const amount = CurrencyAmount.fromScaled('1', ethToken);
      expect(amount.toBignumberish()).toBe(amount.toBigint());
    });
  });
});
