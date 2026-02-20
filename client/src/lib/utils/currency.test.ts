import { describe, expect, it } from 'vitest';
import {
  fromCallData,
  toCalldata,
  formatWithoutExponential,
  formatSmallNumber,
  displayCurrency,
} from './currency';
import BigNumber from 'bignumber.js';

describe('fromCallData', () => {
  it('should scale down an 18-decimal raw value', () => {
    const result = fromCallData('1000000000000000000', 18);
    expect(result.toNumber()).toBe(1);
  });

  it('should scale down a 6-decimal raw value', () => {
    const result = fromCallData('1000000', 6);
    expect(result.toNumber()).toBe(1);
  });

  it('should handle zero', () => {
    const result = fromCallData('0', 18);
    expect(result.toNumber()).toBe(0);
  });

  it('should handle fractional results', () => {
    const result = fromCallData('500000000000000000', 18);
    expect(result.toNumber()).toBe(0.5);
  });

  it('should handle bigint input', () => {
    const result = fromCallData(BigInt('1000000000000000000'), 18);
    expect(result.toNumber()).toBe(1);
  });

  it('should handle very large values', () => {
    const result = fromCallData('1000000000000000000000000', 18); // 1,000,000
    expect(result.toNumber()).toBe(1000000);
  });
});

describe('toCalldata', () => {
  it('should scale up a display value to 18 decimals', () => {
    const result = toCalldata('1', 18);
    expect(result.toFixed(0)).toBe('1000000000000000000');
  });

  it('should scale up a display value to 6 decimals', () => {
    const result = toCalldata('1', 6);
    expect(result.toFixed(0)).toBe('1000000');
  });

  it('should handle BigNumber input', () => {
    const result = toCalldata(new BigNumber('2.5'), 18);
    expect(result.toFixed(0)).toBe('2500000000000000000');
  });

  it('should default to 18 decimals', () => {
    const result = toCalldata('1');
    expect(result.toFixed(0)).toBe('1000000000000000000');
  });

  it('should handle zero', () => {
    const result = toCalldata('0', 18);
    expect(result.toFixed(0)).toBe('0');
  });
});

describe('formatWithoutExponential', () => {
  it('should format zero', () => {
    expect(formatWithoutExponential(0)).toBe('0');
  });

  it('should format a simple integer', () => {
    expect(formatWithoutExponential(42)).toBe('42');
  });

  it('should format a number with decimals', () => {
    const result = formatWithoutExponential(3.14159, 4);
    expect(result).toBe('3.142');
  });

  it('should format large numbers with significant digits', () => {
    // 6 significant digits of 123456789 → 123457 (trailing zeros stripped)
    const result = formatWithoutExponential(123456789, 6);
    expect(result).toBe('123457');
  });

  it('should format small numbers without exponential notation', () => {
    const result = formatWithoutExponential(0.00001234, 4);
    expect(result).toBe('0.00001234');
  });

  it('should format very small numbers', () => {
    const result = formatWithoutExponential(0.00000001, 3);
    expect(result).toBe('0.00000001');
  });

  it('should handle negative numbers', () => {
    // 3 significant digits of -42.5 → -43 (rounded, trailing decimal stripped)
    const result = formatWithoutExponential(-42.5, 3);
    expect(result).toBe('-43');
  });

  it('should handle string input', () => {
    const result = formatWithoutExponential('123.456', 4);
    expect(result).toBe('123.5');
  });

  it('should handle BigNumber input', () => {
    const bn = new BigNumber('0.001234');
    const result = formatWithoutExponential(bn, 3);
    expect(result).toBe('0.00123');
  });

  it('should remove trailing zeros', () => {
    const result = formatWithoutExponential(1.5, 6);
    expect(result).toBe('1.5');
  });
});

describe('formatSmallNumber', () => {
  it('should format zero', () => {
    expect(formatSmallNumber(0)).toBe('0');
  });

  it('should use regular formatting for numbers >= 0.0001', () => {
    const result = formatSmallNumber(0.001, 3);
    expect(result).toBe('0.001');
  });

  it('should use subscript notation for very small numbers (>=4 leading zeros)', () => {
    const result = formatSmallNumber(0.00000012, 3);
    // 0.00000012 has 6 leading zeros after decimal, significantDigits=3 → "120"
    expect(result).toBe('0.0₆120');
  });

  it('should handle 4 leading zeros', () => {
    const result = formatSmallNumber(0.000012345, 3);
    // 4 leading zeros
    expect(result).toBe('0.0₄123');
  });

  it('should handle negative very small numbers', () => {
    const result = formatSmallNumber(-0.00000012, 3);
    // 6 leading zeros, significantDigits=3 → "120"
    expect(result).toBe('-0.0₆120');
  });

  it('should truncate significant digits in subscript notation', () => {
    const result = formatSmallNumber(0.0000001234567, 2);
    // 0.0000001234567 has 6 leading zeros, significantDigits=2 → "12"
    expect(result).toBe('0.0₆12');
  });

  it('should use subscript for double-digit zero count', () => {
    const result = formatSmallNumber('0.00000000000000001', 3);
    // 16 leading zeros, significantDigits=3 → "100"
    expect(result).toBe('0.0₁₆100');
  });
});

describe('displayCurrency', () => {
  it('should format zero', () => {
    expect(displayCurrency(0)).toBe('0');
  });

  it('should format billions', () => {
    expect(displayCurrency(1500000000)).toBe('1.50 B');
  });

  it('should format millions', () => {
    expect(displayCurrency(2500000)).toBe('2.50 M');
  });

  it('should format thousands', () => {
    expect(displayCurrency(1234)).toBe('1.23 K');
  });

  it('should format numbers between 1 and 1000', () => {
    const result = displayCurrency(42.567);
    expect(result).toBe('42.57');
  });

  it('should format very small numbers', () => {
    const result = displayCurrency(0.00000012);
    // 0.00000012 has 6 leading zeros, significantDigits=3 → "120"
    expect(result).toBe('0.0₆120');
  });

  it('should format numbers just under 1', () => {
    const result = displayCurrency(0.5);
    expect(result).toBe('0.5');
  });

  it('should handle negative billions', () => {
    expect(displayCurrency(-1500000000)).toBe('-1.50 B');
  });

  it('should handle negative thousands', () => {
    expect(displayCurrency(-5000)).toBe('-5.00 K');
  });

  it('should handle BigNumber input', () => {
    const bn = new BigNumber(1000000);
    expect(displayCurrency(bn)).toBe('1.00 M');
  });

  it('should handle string input', () => {
    expect(displayCurrency('1000')).toBe('1.00 K');
  });

  it('should format exactly 1 billion', () => {
    expect(displayCurrency(1000000000)).toBe('1.00 B');
  });

  it('should format exactly 1 million', () => {
    expect(displayCurrency(1000000)).toBe('1.00 M');
  });

  it('should format exactly 1 thousand', () => {
    expect(displayCurrency(1000)).toBe('1.00 K');
  });
});
