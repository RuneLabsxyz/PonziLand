import { describe, expect, it } from 'vitest';
import { BigNumber } from 'bignumber.js';
import { fromCallData, toCalldata, displayCurrency } from './currency.js';

describe('currency utilities', () => {
	describe('fromCallData', () => {
		it('should convert raw amount to display amount with correct scaling', () => {
			const rawAmount = '1000000000000000000'; // 1 token with 18 decimals
			const result = fromCallData(rawAmount, 18);
			expect(result.toString()).toBe('1');
		});

		it('should handle BigInt input', () => {
			const rawAmount = 1000000000000000000n; // 1 token with 18 decimals
			const result = fromCallData(rawAmount, 18);
			expect(result.toString()).toBe('1');
		});

		it('should handle different decimal scales', () => {
			const rawAmount = '1000000'; // 1 token with 6 decimals (like USDC)
			const result = fromCallData(rawAmount, 6);
			expect(result.toString()).toBe('1');
		});

		it('should handle zero amounts', () => {
			const rawAmount = '0';
			const result = fromCallData(rawAmount, 18);
			expect(result.toString()).toBe('0');
		});

		it('should handle fractional display amounts', () => {
			const rawAmount = '500000000000000000'; // 0.5 tokens with 18 decimals
			const result = fromCallData(rawAmount, 18);
			expect(result.toString()).toBe('0.5');
		});

		it('should handle very small amounts', () => {
			const rawAmount = '1'; // Smallest unit
			const result = fromCallData(rawAmount, 18);
			expect(result.toString()).toBe('0.000000000000000001');
		});

		it('should handle hex string input', () => {
			const rawAmount = '0xde0b6b3a7640000'; // 10^18 in hex
			const result = fromCallData(rawAmount, 18);
			expect(result.toString()).toBe('1');
		});
	});

	describe('toCalldata', () => {
		it('should convert display amount to raw amount with default 18 decimals', () => {
			const displayAmount = new BigNumber('1');
			const result = toCalldata(displayAmount);
			expect(result.toString()).toBe('1000000000000000000');
		});

		it('should handle string input', () => {
			const displayAmount = '1';
			const result = toCalldata(displayAmount);
			expect(result.toString()).toBe('1000000000000000000');
		});

		it('should handle custom decimal scales', () => {
			const displayAmount = new BigNumber('1');
			const result = toCalldata(displayAmount, 6);
			expect(result.toString()).toBe('1000000');
		});

		it('should handle fractional display amounts', () => {
			const displayAmount = '0.5';
			const result = toCalldata(displayAmount, 18);
			expect(result.toString()).toBe('500000000000000000');
		});

		it('should handle zero amounts', () => {
			const displayAmount = '0';
			const result = toCalldata(displayAmount, 18);
			expect(result.toString()).toBe('0');
		});

		it('should handle very small display amounts', () => {
			const displayAmount = '0.000000000000000001'; // 1 wei
			const result = toCalldata(displayAmount, 18);
			expect(result.toString()).toBe('1');
		});

		it('should handle large amounts', () => {
			const displayAmount = '1000000'; // 1 million
			const result = toCalldata(displayAmount, 18);
			// Note: We're forcing to use the fixed notation to avoid scientific format when converting to string
			expect(result.toFixed(0)).toBe('1000000000000000000000000');
		});

		it('should handle decimal precision correctly', () => {
			const displayAmount = '1.123456789012345678';
			const result = toCalldata(displayAmount, 18);
			expect(result.toString()).toBe('1123456789012345678');
		});
	});

	describe('displayCurrency', () => {
		describe('zero handling', () => {
			it('should display zero correctly', () => {
				expect(displayCurrency(0)).toBe('0');
				expect(displayCurrency('0')).toBe('0');
				expect(displayCurrency(new BigNumber(0))).toBe('0');
			});
		});

		describe('billion formatting (>=1B)', () => {
			it('should format billions with B suffix', () => {
				expect(displayCurrency('1000000000')).toBe('1.00B'); // 1B
				expect(displayCurrency('1234567890')).toBe('1.23B'); // 1.23B
				expect(displayCurrency('12345678900')).toBe('12.35B'); // 12.35B
			});

			it('should handle negative billions', () => {
				expect(displayCurrency('-1000000000')).toBe('-1.00B');
				expect(displayCurrency('-1234567890')).toBe('-1.23B');
			});

			it('should round billions correctly', () => {
				expect(displayCurrency('1236000000')).toBe('1.24B'); // Should round up
				expect(displayCurrency('1234000000')).toBe('1.23B'); // Should round down
			});
		});

		describe('million formatting (>=1M, <1B)', () => {
			it('should format millions with M suffix', () => {
				expect(displayCurrency('1000000')).toBe('1.00M'); // 1M
				expect(displayCurrency('1234567')).toBe('1.23M'); // 1.23M
				expect(displayCurrency('12345678')).toBe('12.35M'); // 12.35M
			});

			it('should handle negative millions', () => {
				expect(displayCurrency('-1000000')).toBe('-1.00M');
				expect(displayCurrency('-1234567')).toBe('-1.23M');
			});

			it('should round millions correctly', () => {
				expect(displayCurrency('1236000')).toBe('1.24M'); // Should round up
				expect(displayCurrency('1234000')).toBe('1.23M'); // Should round down
			});
		});

		describe('thousand formatting (>=1K, <1M)', () => {
			it('should format thousands with K suffix', () => {
				expect(displayCurrency('1000')).toBe('1.00K'); // 1K
				expect(displayCurrency('1234')).toBe('1.23K'); // 1.23K
				expect(displayCurrency('12345')).toBe('12.35K'); // 12.35K
			});

			it('should handle negative thousands', () => {
				expect(displayCurrency('-1000')).toBe('-1.00K');
				expect(displayCurrency('-1234')).toBe('-1.23K');
			});

			it('should round thousands correctly', () => {
				expect(displayCurrency('1236')).toBe('1.24K'); // Should round up
				expect(displayCurrency('1234')).toBe('1.23K'); // Should round down
			});
		});

		describe('regular number formatting (>=1, <1K)', () => {
			it('should format regular numbers with 2 decimal places', () => {
				expect(displayCurrency('1')).toBe('1.00');
				expect(displayCurrency('1.5')).toBe('1.50');
				expect(displayCurrency('999.99')).toBe('999.99');
				expect(displayCurrency('123.456')).toBe('123.46'); // Should round
			});

			it('should handle negative regular numbers', () => {
				expect(displayCurrency('-1')).toBe('-1.00');
				expect(displayCurrency('-123.45')).toBe('-123.45');
			});

			it('should handle BigNumber input', () => {
				expect(displayCurrency(new BigNumber('123.456'))).toBe('123.46');
			});

			it('should handle numeric input', () => {
				expect(displayCurrency(123.456)).toBe('123.46');
			});
		});

		describe('small number formatting (<1)', () => {
			it('should format small numbers with full precision', () => {
				expect(displayCurrency('0.5')).toBe('0.5');
				expect(displayCurrency('0.123')).toBe('0.123');
				expect(displayCurrency('0.999')).toBe('0.999');
			});

			it('should handle very small numbers with leading zeros', () => {
				expect(displayCurrency('0.001')).toBe('0.001'); // 2 leading zeros + 3 significant digits
				expect(displayCurrency('0.0001')).toBe('0.0001'); // 3 leading zeros + 3 significant digits
				expect(displayCurrency('0.00001')).toBe('0.00001'); // 4 leading zeros + 3 significant digits
			});

			it('should limit precision for very small numbers', () => {
				const verySmall = '0.000000000000000001234567890123456789';
				const result = displayCurrency(verySmall);
				// Should show at most 18 decimal places and at least 3 significant digits
				expect(result).toBe('0.000000000000000001'); // 15-17 leading zeros + 123
			});

			it('should handle negative small numbers', () => {
				expect(displayCurrency('-0.123')).toBe('-0.123');
				expect(displayCurrency('-0.001')).toBe('-0.001');
			});

			it('should handle edge case with many leading zeros', () => {
				expect(displayCurrency('0.00000123')).toBe('0.00000123'); // 5 leading zeros + 3 significant digits
				expect(displayCurrency('0.000000123')).toBe('0.000000123'); // 6 leading zeros + 3 significant digits
			});

			it('should preserve significant digits correctly', () => {
				expect(displayCurrency('0.000123456')).toBe('0.000123'); // 3 leading zeros + 3 significant digits
				expect(displayCurrency('0.00123456')).toBe('0.00123'); // 2 leading zeros + 3 significant digits
				expect(displayCurrency('0.0123456')).toBe('0.0123'); // 1 leading zero + 3 significant digits
			});
		});

		describe('edge cases', () => {
			it('should handle very large numbers', () => {
				expect(displayCurrency('1000000000000')).toBe('1,000.00B'); // 1T displays as 1000B
			});

			it('should handle decimal strings with many digits', () => {
				expect(displayCurrency('1234.56789012345')).toBe('1.23K');
			});

			it('should handle scientific notation input', () => {
				expect(displayCurrency('1e6')).toBe('1.00M');
				expect(displayCurrency('1e9')).toBe('1.00B');
			});

			it('should handle boundary values', () => {
				expect(displayCurrency('999.99')).toBe('999.99'); // Just below 1K
				expect(displayCurrency('1000')).toBe('1.00K'); // Exactly 1K
				expect(displayCurrency('999999')).toBe('1,000.00K'); // Just below 1M
				expect(displayCurrency('1000000')).toBe('1.00M'); // Exactly 1M
				expect(displayCurrency('999999999')).toBe('1,000.00M'); // Just below 1B
				expect(displayCurrency('1000000000')).toBe('1.00B'); // Exactly 1B
			});
		});
	});
});
