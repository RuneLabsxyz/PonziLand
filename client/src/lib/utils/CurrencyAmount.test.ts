import { flushSync } from 'svelte';
import { describe, expect, test, it } from 'vitest';
import { CurrencyAmount } from './CurrencyAmount';
import type { Token } from '$lib/interfaces';
import BigNumber from 'bignumber.js';

const TestTokens: Record<string, Token> = {
  standard: {
    name: 'Standard',
    address: '0x0',
    symbol: 'STD',
    liquidityPoolType: 'standard',
    decimals: 18,
    skin: 'strk',
  },
  noDecimals: {
    name: 'No Decimals',
    address: '0x0',
    symbol: 'ND',
    liquidityPoolType: 'standard',
    decimals: 0,
    skin: 'strk',
  },
};

describe('CurrencyAmount', () => {
  describe('Parsing unscaled number', () => {
    const expectedValue = new BigNumber(1);

    it('Works with a bigint', () => {
      const amount = CurrencyAmount.fromUnscaled(
        1_000_000_000_000_000_000n,
        TestTokens.standard,
      );
      expect(amount.rawValue()).toEqual(expectedValue);
    });

    it('Works with an unscaled string', () => {
      // This is the format we get back from the on-chain functions
      const stringAmount = `0x${1_000_000_000_000_000_000n.toString(16)}`;

      const amount = CurrencyAmount.fromUnscaled(
        stringAmount,
        TestTokens.standard,
      );

      expect(amount.rawValue()).toEqual(expectedValue);
    });

    it('Works with a custom token with no decimals', () => {
      const amount = CurrencyAmount.fromUnscaled(1_000n, TestTokens.noDecimals);
      expect(amount.rawValue()).toEqual(new BigNumber(1_000));
    });
  });

  describe('Parsing scaled number', () => {
    it('Works with a bigint', () => {
      const amount = CurrencyAmount.fromScaled(1n, TestTokens.standard);
      expect(amount.rawValue()).toEqual(new BigNumber(1));
    });

    it('Works with a string', () => {
      const amount = CurrencyAmount.fromScaled('1', TestTokens.standard);
      expect(amount.rawValue()).toEqual(new BigNumber(1));
    });

    it('Does not accept more decimals than available', () => {
      const amount = CurrencyAmount.fromScaled('1.23', TestTokens.noDecimals);

      expect(amount.rawValue()).toEqual(new BigNumber(1));
    });
  });

  describe('Formatting', () => {
    it('Formats zero correctly', () => {
      const amount = CurrencyAmount.fromScaled('0', TestTokens.standard);
      expect(amount.toString()).toBe('0');
    });

    it('Formats correctly a whole number', () => {
      const amount = CurrencyAmount.fromScaled('1', TestTokens.standard);
      expect(amount.toString()).toBe('1.00');

      expect(
        CurrencyAmount.fromScaled('2', TestTokens.standard).toString(),
      ).toBe('2.00');
    });

    it('Formats correctly a number > 1 with decimals', () => {
      const scaledString = CurrencyAmount.fromScaled(
        '1.1234',
        TestTokens.standard,
      );
      expect(scaledString.toString()).toBe('1.12');
    });

    it('Rounds correctly a number > 1 with decimals', () => {
      expect(
        CurrencyAmount.fromScaled('1.128', TestTokens.standard).toString(),
      ).toBe('1.13');
    });

    it('Formats correctly thousands with K suffix', () => {
      expect(
        CurrencyAmount.fromScaled('1500', TestTokens.standard).toString(),
      ).toBe('1.50K');

      expect(
        CurrencyAmount.fromScaled('12345', TestTokens.standard).toString(),
      ).toBe('12.35K');
    });

    it('Formats correctly millions with M suffix', () => {
      expect(
        CurrencyAmount.fromScaled('1500000', TestTokens.standard).toString(),
      ).toBe('1.50M');

      expect(
        CurrencyAmount.fromScaled('12345678', TestTokens.standard).toString(),
      ).toBe('12.35M');
    });

    it('Formats correctly billions with B suffix', () => {
      expect(
        CurrencyAmount.fromScaled('1500000000', TestTokens.standard).toString(),
      ).toBe('1.50B');

      expect(
        CurrencyAmount.fromScaled(
          '12345678900',
          TestTokens.standard,
        ).toString(),
      ).toBe('12.35B');
    });

    it('Formats correctly a number < 1 with proper precision', () => {
      expect(
        CurrencyAmount.fromScaled('0.00123', TestTokens.standard).toString(),
      ).toBe('0.00123');
    });

    it('Formats correctly very small numbers with leading zeros', () => {
      expect(
        CurrencyAmount.fromScaled('0.001289', TestTokens.standard).toString(),
      ).toBe('0.00129');
    });

    it('Formats correctly the smallest representable amount', () => {
      // Minimal representable value with 18 decimals - now uses exponential notation for space efficiency
      expect(
        CurrencyAmount.fromUnscaled('1', TestTokens.standard).toString(),
      ).toBe('1.00e-18');
    });

    it('Uses exponential notation for numbers with many leading zeros', () => {
      // Numbers with >4 leading zeros use exponential notation
      expect(
        CurrencyAmount.fromScaled(
          '0.000001234',
          TestTokens.standard,
        ).toString(),
      ).toBe('1.23e-6');

      expect(
        CurrencyAmount.fromScaled('0.00000987', TestTokens.standard).toString(),
      ).toBe('9.87e-6');
    });

    it('Uses regular decimal notation for numbers with ≤4 leading zeros', () => {
      // Numbers with ≤4 leading zeros use regular notation
      expect(
        CurrencyAmount.fromScaled('0.0001234', TestTokens.standard).toString(),
      ).toBe('0.000123');

      expect(
        CurrencyAmount.fromScaled('0.00012', TestTokens.standard).toString(),
      ).toBe('0.000120');
    });
  });
});
