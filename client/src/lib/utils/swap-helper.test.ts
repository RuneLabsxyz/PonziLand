import { describe, expect, it } from 'vitest';
import { calculateDeficitWithBuffer } from './swap-helper';
import { CurrencyAmount } from './CurrencyAmount';
import type { Token } from '$lib/interfaces';

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

describe('calculateDeficitWithBuffer', () => {
  const ethToken = mockToken();

  it('should return null when available >= required (no deficit)', () => {
    const required = CurrencyAmount.fromScaled('10', ethToken);
    const available = CurrencyAmount.fromScaled('15', ethToken);
    expect(calculateDeficitWithBuffer(required, available)).toBeNull();
  });

  it('should return null when available equals required', () => {
    const required = CurrencyAmount.fromScaled('10', ethToken);
    const available = CurrencyAmount.fromScaled('10', ethToken);
    expect(calculateDeficitWithBuffer(required, available)).toBeNull();
  });

  it('should return deficit with default 5% buffer', () => {
    const required = CurrencyAmount.fromScaled('100', ethToken);
    const available = CurrencyAmount.fromScaled('80', ethToken);
    // deficit = 100 - 80 = 20
    // buffered = 20 * 1.05 = 21
    const result = calculateDeficitWithBuffer(required, available);
    expect(result).toBe('21');
  });

  it('should return full amount with buffer when available is null', () => {
    const required = CurrencyAmount.fromScaled('100', ethToken);
    // deficit = full amount = 100
    // buffered = 100 * 1.05 = 105
    const result = calculateDeficitWithBuffer(required, null);
    expect(result).toBe('105');
  });

  it('should return full amount with buffer when available is zero', () => {
    const required = CurrencyAmount.fromScaled('100', ethToken);
    const available = CurrencyAmount.fromScaled('0', ethToken);
    // deficit = full amount = 100
    // buffered = 100 * 1.05 = 105
    const result = calculateDeficitWithBuffer(required, available);
    expect(result).toBe('105');
  });

  it('should use custom buffer percentage', () => {
    const required = CurrencyAmount.fromScaled('100', ethToken);
    const available = CurrencyAmount.fromScaled('80', ethToken);
    // deficit = 20, buffer = 10%
    // buffered = 20 * 1.10 = 22
    const result = calculateDeficitWithBuffer(required, available, 10);
    expect(result).toBe('22');
  });

  it('should handle zero buffer percentage', () => {
    const required = CurrencyAmount.fromScaled('100', ethToken);
    const available = CurrencyAmount.fromScaled('80', ethToken);
    // deficit = 20, buffer = 0%
    // buffered = 20 * 1.0 = 20
    const result = calculateDeficitWithBuffer(required, available, 0);
    expect(result).toBe('20');
  });

  it('should handle fractional amounts', () => {
    const required = CurrencyAmount.fromScaled('1.5', ethToken);
    const available = CurrencyAmount.fromScaled('0.5', ethToken);
    // deficit = 1.0
    // buffered = 1.0 * 1.05 = 1.05
    const result = calculateDeficitWithBuffer(required, available);
    expect(result).toBe('1.05');
  });

  it('should handle very small deficit', () => {
    const required = CurrencyAmount.fromScaled('10', ethToken);
    const available = CurrencyAmount.fromScaled('9.99', ethToken);
    // deficit = 0.01
    // buffered = 0.01 * 1.05 = 0.0105
    const result = calculateDeficitWithBuffer(required, available);
    expect(result).toBe('0.0105');
  });
});
