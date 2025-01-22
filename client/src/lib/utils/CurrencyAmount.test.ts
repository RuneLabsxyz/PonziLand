import { flushSync } from 'svelte';
import { describe, expect, test, it } from 'vitest';
import { CurrencyAmount } from './CurrencyAmount';
import type { Token } from '$lib/interfaces';
import BigNumber from 'bignumber.js';

const TestTokens = {
  standard: {
    name: 'Standard',
    address: '0x0',
    lpAddress: '0x0',
    decimals: 18,
    images: {
      icon: '',
      castle: {
        basic: '',
        advanced: '',
        premium: '',
      },
    },
  },
  noDecimals: {
    name: 'No Decimals',
    address: '0x0',
    lpAddress: '0x0',
    decimals: 0,
    images: {
      icon: '',
      castle: {
        basic: '',
        advanced: '',
        premium: '',
      },
    },
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
    it('Formats correctly a whole number', () => {
      const amount = CurrencyAmount.fromScaled('1', TestTokens.standard);
      expect(amount.toString()).toBe('1');

      expect(
        CurrencyAmount.fromScaled('2', TestTokens.standard).toString(),
      ).toBe('2');
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

    it('Formats correctly a number < 1', () => {
      expect(
        CurrencyAmount.fromScaled('0.00123', TestTokens.standard).toString(),
      ).toBe('0.0012');
    });

    it('Rounds correctly a number < 1', () => {
      expect(
        CurrencyAmount.fromScaled('0.001289', TestTokens.standard).toString(),
      ).toBe('0.0013');
    });

    it('Formats correctly the smallest representable amount', () => {
      // Minimal representable value with 18 decimals
      expect(
        CurrencyAmount.fromUnscaled('1', TestTokens.standard).toString(),
      ).toBe('0.000000000000000001');
    });
  });
});
