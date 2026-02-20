import { describe, expect, it } from 'vitest';
import { formatPercentage, formatPercentageFixed } from './format';

describe('formatPercentage', () => {
  it('should format large percentages with 1 decimal', () => {
    expect(formatPercentage(15.678)).toBe('+15.7%');
  });

  it('should format medium percentages with 2 decimals', () => {
    expect(formatPercentage(5.4321)).toBe('+5.43%');
  });

  it('should format small percentages with 3 decimals', () => {
    expect(formatPercentage(0.1234)).toBe('+0.123%');
  });

  it('should format very small percentages with 4 decimals', () => {
    expect(formatPercentage(0.00567)).toBe('+0.0057%');
  });

  it('should include + sign for positive values by default', () => {
    expect(formatPercentage(10)).toBe('+10.0%');
  });

  it('should include - sign for negative values', () => {
    expect(formatPercentage(-5.5)).toBe('-5.50%');
  });

  it('should omit sign when includeSign is false', () => {
    expect(formatPercentage(10, false)).toBe('10.0%');
  });

  it('should format zero without sign', () => {
    expect(formatPercentage(0)).toBe('0.0000%');
  });

  it('should handle negative large percentages', () => {
    expect(formatPercentage(-25.678)).toBe('-25.7%');
  });

  it('should handle exactly 10', () => {
    expect(formatPercentage(10)).toBe('+10.0%');
  });

  it('should handle exactly 1', () => {
    expect(formatPercentage(1)).toBe('+1.00%');
  });

  it('should handle exactly 0.01', () => {
    expect(formatPercentage(0.01)).toBe('+0.010%');
  });
});

describe('formatPercentageFixed', () => {
  it('should format with specified precision', () => {
    expect(formatPercentageFixed(12.345, 2)).toBe('+12.35%');
  });

  it('should format with 0 precision', () => {
    expect(formatPercentageFixed(12.345, 0)).toBe('+12%');
  });

  it('should format negative values', () => {
    expect(formatPercentageFixed(-5.5, 1)).toBe('-5.5%');
  });

  it('should omit sign when includeSign is false', () => {
    expect(formatPercentageFixed(10, 2, false)).toBe('10.00%');
  });

  it('should format zero', () => {
    expect(formatPercentageFixed(0, 2)).toBe('0.00%');
  });

  it('should handle high precision', () => {
    expect(formatPercentageFixed(3.14159, 4)).toBe('+3.1416%');
  });
});
