import { describe, expect, it } from 'vitest';
import { CurrencyAmount } from './currencyAmount.js';
import type { Token } from '../types.js';
import { BigNumber } from 'bignumber.js';

const TestTokens: Record<string, Token> = {
	standard: {
		name: 'Standard',
		address: '0x0',
		symbol: 'STD',
		liquidityPoolType: 'standard',
		decimals: 18,
		icon: ''
	},
	noDecimals: {
		name: 'No Decimals',
		address: '0x0',
		symbol: 'ND',
		liquidityPoolType: 'standard',
		decimals: 0,
		icon: ''
	}
};

describe('CurrencyAmount', () => {
	describe('Parsing unscaled number', () => {
		const expectedValue = new BigNumber(1);

		it('Works with a bigint', () => {
			const amount = CurrencyAmount.fromUnscaled(1_000_000_000_000_000_000n, TestTokens.standard);
			expect(amount.rawValue()).toEqual(expectedValue);
		});

		it('Works with an unscaled string', () => {
			// This is the format we get back from the on-chain functions
			const stringAmount = `0x${1_000_000_000_000_000_000n.toString(16)}`;

			const amount = CurrencyAmount.fromUnscaled(stringAmount, TestTokens.standard);

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

			expect(CurrencyAmount.fromScaled('2', TestTokens.standard).toString()).toBe('2.00');
		});

		it('Formats correctly a number > 1 with decimals', () => {
			const scaledString = CurrencyAmount.fromScaled('1.1234', TestTokens.standard);
			expect(scaledString.toString()).toBe('1.12');
		});

		it('Rounds correctly a number > 1 with decimals', () => {
			expect(CurrencyAmount.fromScaled('1.128', TestTokens.standard).toString()).toBe('1.13');
		});

		it('Formats correctly thousands with K suffix', () => {
			expect(CurrencyAmount.fromScaled('1500', TestTokens.standard).toString()).toBe('1.50K');

			expect(CurrencyAmount.fromScaled('12345', TestTokens.standard).toString()).toBe('12.35K');
		});

		it('Formats correctly millions with M suffix', () => {
			expect(CurrencyAmount.fromScaled('1500000', TestTokens.standard).toString()).toBe('1.50M');

			expect(CurrencyAmount.fromScaled('12345678', TestTokens.standard).toString()).toBe('12.35M');
		});

		it('Formats correctly billions with B suffix', () => {
			expect(CurrencyAmount.fromScaled('1500000000', TestTokens.standard).toString()).toBe('1.50B');

			expect(CurrencyAmount.fromScaled('12345678900', TestTokens.standard).toString()).toBe(
				'12.35B'
			);
		});

		it('Formats correctly a number < 1 with proper precision', () => {
			expect(CurrencyAmount.fromScaled('0.00123', TestTokens.standard).toString()).toBe('0.00123');
		});

		it('Formats correctly very small numbers with leading zeros', () => {
			expect(CurrencyAmount.fromScaled('0.001289', TestTokens.standard).toString()).toBe('0.00129');
		});

		it('Formats correctly the smallest representable amount', () => {
			// Minimal representable value with 18 decimals - now uses formatWithoutExponential
			expect(CurrencyAmount.fromUnscaled('1', TestTokens.standard).toString()).toBe(
				'0.000000000000000001'
			);
		});

		it('Formats very small numbers without exponential notation', () => {
			// Numbers with many leading zeros now use formatWithoutExponential (3 significant digits)
			expect(CurrencyAmount.fromScaled('0.000001234', TestTokens.standard).toString()).toBe(
				'0.00000123'
			);

			expect(CurrencyAmount.fromScaled('0.00000987', TestTokens.standard).toString()).toBe(
				'0.00000987'
			);
		});

		it('Formats small numbers with proper significant digits', () => {
			// Numbers with leading zeros use formatWithoutExponential with 3 significant digits
			expect(CurrencyAmount.fromScaled('0.0001234', TestTokens.standard).toString()).toBe(
				'0.000123'
			);

			expect(CurrencyAmount.fromScaled('0.000012', TestTokens.standard).toString()).toBe(
				'0.000012'
			);
		});
	});

	describe('Addition operations', () => {
		it('Preserves token when adding two amounts with the same token', () => {
			const amount1 = CurrencyAmount.fromScaled('10', TestTokens.standard);
			const amount2 = CurrencyAmount.fromScaled('5', TestTokens.standard);

			const result = amount1.add(amount2);

			expect(result.getToken()).toBe(TestTokens.standard);
			expect(result.rawValue()).toEqual(new BigNumber(15));
		});

		it('Preserves token when adding amount with token to amount without token', () => {
			const amountWithToken = CurrencyAmount.fromScaled('10', TestTokens.standard);
			const amountWithoutToken = CurrencyAmount.fromScaled('5');

			const result = amountWithToken.add(amountWithoutToken);

			expect(result.getToken()).toBe(TestTokens.standard);
			expect(result.rawValue()).toEqual(new BigNumber(15));
		});

		it('Results in no token when adding amount without token to amount with token', () => {
			const amountWithoutToken = CurrencyAmount.fromScaled('10');
			const amountWithToken = CurrencyAmount.fromScaled('5', TestTokens.standard);

			const result = amountWithoutToken.add(amountWithToken);

			expect(result.getToken()).toBeUndefined();
			expect(result.rawValue()).toEqual(new BigNumber(15));
		});

		it('Results in no token when adding two amounts without tokens', () => {
			const amount1 = CurrencyAmount.fromScaled('10');
			const amount2 = CurrencyAmount.fromScaled('5');

			const result = amount1.add(amount2);

			expect(result.getToken()).toBeUndefined();
			expect(result.rawValue()).toEqual(new BigNumber(15));
		});

		it('Throws error when adding amounts with different tokens', () => {
			const amount1 = CurrencyAmount.fromScaled('10', TestTokens.standard);
			const amount2 = CurrencyAmount.fromScaled('5', TestTokens.noDecimals);

			expect(() => amount1.add(amount2)).toThrow('Incompatible currencies!');
		});
	});
});
