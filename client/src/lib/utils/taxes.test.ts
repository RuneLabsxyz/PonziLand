import { describe, expect, it, vi } from 'vitest';

// Mock the config store
vi.mock('$lib/stores/config.store.svelte', () => ({
  configValues: {
    gameSpeed: 5,
    taxRate: 2,
    baseTime: 3600,
  },
}));

// Mock profile data
vi.mock('$profileData', () => ({
  default: {
    availableTokens: [],
  },
}));

// Mock neighbors — provide maxNeighbors matching contracts/src/helpers/coord.cairo
vi.mock('$lib/api/neighbors', () => ({
  Neighbors: {
    getLocations: vi.fn(),
  },
  maxNeighbors: (location: number) => {
    const COORD_MULTIPLIER = 256;
    const COORD_MASK = 0xff;
    const MAX_GRID_SIZE = 255;
    const row = Math.floor(location / COORD_MULTIPLIER);
    const col = location & COORD_MASK;
    let count = 0;
    if (col > 0) count++;
    if (col < MAX_GRID_SIZE) count++;
    if (row > 0) count++;
    if (row < MAX_GRID_SIZE) count++;
    if (row > 0 && col > 0) count++;
    if (row > 0 && col < MAX_GRID_SIZE) count++;
    if (row < MAX_GRID_SIZE && col > 0) count++;
    if (row < MAX_GRID_SIZE && col < MAX_GRID_SIZE) count++;
    return count;
  },
}));

// Mock utils
vi.mock('$lib/utils', () => ({
  toHexWithPadding: vi.fn((v: bigint) => '0x' + v.toString(16)),
  padAddress: vi.fn((a: string) => a),
}));

import {
  burnForOneNeighbor,
  calculateBurnRate,
  calculateTaxes,
  estimateTax,
} from './taxes';
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

describe('burnForOneNeighbor', () => {
  const ethToken = mockToken();

  it('should calculate burn rate for one neighbor', () => {
    // sellPrice = 100, taxRate = 2, gameSpeed = 5, maxN = 8
    // burn = 100 * 2 * 5 / (8 * 100) = 1000 / 800 = 1.25
    const sellPrice = CurrencyAmount.fromScaled('100', ethToken);
    const result = burnForOneNeighbor(sellPrice);
    expect(result.toNumber()).toBe(1.25);
  });

  it('should handle zero sell price', () => {
    const sellPrice = CurrencyAmount.fromScaled('0', ethToken);
    const result = burnForOneNeighbor(sellPrice);
    expect(result.toNumber()).toBe(0);
  });

  it('should handle small sell prices', () => {
    // sellPrice = 1, taxRate = 2, gameSpeed = 5, maxN = 8
    // burn = 1 * 2 * 5 / (8 * 100) = 10 / 800 = 0.0125
    const sellPrice = CurrencyAmount.fromScaled('1', ethToken);
    const result = burnForOneNeighbor(sellPrice);
    expect(result.toNumber()).toBe(0.0125);
  });
});

describe('calculateBurnRate', () => {
  const ethToken = mockToken();

  it('should calculate burn rate for multiple neighbors at level 1 (no discount)', () => {
    // burnForOneNeighbor(100) = 1.25
    // base = 1.25 * 4 = 5
    // level 1 discount = 0, so result = 5
    const sellPrice = CurrencyAmount.fromScaled('100', ethToken);
    const result = calculateBurnRate(sellPrice, 1, 4);
    expect(result.toNumber()).toBe(5);
  });

  it('should apply 10% discount at level 2', () => {
    // burnForOneNeighbor(100) = 1.25
    // base = 1.25 * 4 = 5
    // level 2 discount = 10%, so result = 5 * 90 / 100 = 4.5
    const sellPrice = CurrencyAmount.fromScaled('100', ethToken);
    const result = calculateBurnRate(sellPrice, 2, 4);
    expect(result.toNumber()).toBe(4.5);
  });

  it('should apply 15% discount at level 3', () => {
    // burnForOneNeighbor(100) = 1.25
    // base = 1.25 * 4 = 5
    // level 3 discount = 15%, so result = 5 * 85 / 100 = 4.25
    const sellPrice = CurrencyAmount.fromScaled('100', ethToken);
    const result = calculateBurnRate(sellPrice, 3, 4);
    expect(result.toNumber()).toBe(4.25);
  });

  it('should handle zero neighbors', () => {
    const sellPrice = CurrencyAmount.fromScaled('100', ethToken);
    const result = calculateBurnRate(sellPrice, 1, 0);
    expect(result.toNumber()).toBe(0);
  });

  it('should handle 8 neighbors (max)', () => {
    // burnForOneNeighbor(100) = 1.25
    // base = 1.25 * 8 = 10
    const sellPrice = CurrencyAmount.fromScaled('100', ethToken);
    const result = calculateBurnRate(sellPrice, 1, 8);
    expect(result.toNumber()).toBe(10);
  });

  it('should return no discount for unknown level', () => {
    // Level 0 or level 4+ should have 0 discount
    const sellPrice = CurrencyAmount.fromScaled('100', ethToken);
    const result = calculateBurnRate(sellPrice, 0, 4);
    expect(result.toNumber()).toBe(5);
  });
});

describe('calculateTaxes', () => {
  it('should calculate taxes for a valid sell amount', () => {
    // taxes = (sellAmount * taxRate * gameSpeed) / (maxN * 100)
    // = (1000 * 2 * 5) / (8 * 100) = 10000 / 800 = 12.5
    expect(calculateTaxes(1000)).toBe(12.5);
  });

  it('should return 0 for zero sell amount', () => {
    expect(calculateTaxes(0)).toBe(0);
  });

  it('should return 0 for negative sell amount', () => {
    expect(calculateTaxes(-100)).toBe(0);
  });

  it('should return 0 for NaN', () => {
    expect(calculateTaxes(NaN)).toBe(0);
  });

  it('should handle very small amounts', () => {
    const result = calculateTaxes(1);
    expect(result).toBe(0.0125);
  });

  it('should handle very large amounts', () => {
    const result = calculateTaxes(1000000);
    expect(result).toBe(12500);
  });
});

describe('estimateTax', () => {
  it('should estimate tax parameters for a given sell price', () => {
    // gameSpeed = 5, taxRate = 2, baseTime = 3600, maxNeighbours = 8
    // maxRate = 1000 * 2 * 5 = 10000
    // ratePerNeighbour = 10000 / 8 = 1250
    const result = estimateTax(1000);
    expect(result.taxRate).toBe(2);
    expect(result.baseTime).toBe(3600);
    expect(result.maxRate).toBe(10000);
    expect(result.ratePerNeighbour).toBe(1250);
  });

  it('should return zeros for zero sell price', () => {
    const result = estimateTax(0);
    expect(result.taxRate).toBe(0);
    expect(result.baseTime).toBe(0);
    expect(result.maxRate).toBe(0);
    expect(result.ratePerNeighbour).toBe(0);
  });

  it('should return zeros for negative sell price', () => {
    const result = estimateTax(-100);
    expect(result.taxRate).toBe(0);
    expect(result.baseTime).toBe(0);
    expect(result.maxRate).toBe(0);
    expect(result.ratePerNeighbour).toBe(0);
  });

  it('should return zeros for NaN', () => {
    const result = estimateTax(NaN);
    expect(result.taxRate).toBe(0);
    expect(result.baseTime).toBe(0);
  });
});

describe('calculateBurnRate edge cases', () => {
  const ethToken = mockToken();

  it('should handle single neighbor (corner/edge land simulation)', () => {
    // Corner lands may have only 3 neighbors, edge lands 5
    // This tests the burn rate scales linearly with neighbor count
    const sellPrice = CurrencyAmount.fromScaled('100', ethToken);

    const rate1 = calculateBurnRate(sellPrice, 1, 1);
    const rate3 = calculateBurnRate(sellPrice, 1, 3);
    const rate5 = calculateBurnRate(sellPrice, 1, 5);
    const rate8 = calculateBurnRate(sellPrice, 1, 8);

    // Rates should scale proportionally with neighbor count
    expect(rate3.toNumber()).toBeCloseTo(rate1.toNumber() * 3, 10);
    expect(rate5.toNumber()).toBeCloseTo(rate1.toNumber() * 5, 10);
    expect(rate8.toNumber()).toBeCloseTo(rate1.toNumber() * 8, 10);
  });

  it('should handle all discount levels with 1 neighbor', () => {
    const sellPrice = CurrencyAmount.fromScaled('1000', ethToken);
    const baseRate = calculateBurnRate(sellPrice, 1, 1).toNumber();

    // Level 2: 10% discount
    const level2Rate = calculateBurnRate(sellPrice, 2, 1).toNumber();
    expect(level2Rate).toBeCloseTo(baseRate * 0.9, 10);

    // Level 3: 15% discount
    const level3Rate = calculateBurnRate(sellPrice, 3, 1).toNumber();
    expect(level3Rate).toBeCloseTo(baseRate * 0.85, 10);
  });

  it('should not apply discount for levels above 3', () => {
    const sellPrice = CurrencyAmount.fromScaled('100', ethToken);
    const level1Rate = calculateBurnRate(sellPrice, 1, 4).toNumber();
    const level4Rate = calculateBurnRate(sellPrice, 4, 4).toNumber();

    // Level 4+ has no discount (returns 0 from calculateDiscount)
    expect(level4Rate).toBe(level1Rate);
  });

  it('should handle very large sell prices', () => {
    const sellPrice = CurrencyAmount.fromScaled('1000000', ethToken);
    const result = calculateBurnRate(sellPrice, 1, 8);
    // burnForOneNeighbor(1000000) = 1000000 * 2 * 5 / (8 * 100) = 12500
    // rate = 12500 * 8 = 100000
    expect(result.toNumber()).toBe(100000);
  });

  it('should handle very small sell prices', () => {
    const sellPrice = CurrencyAmount.fromScaled('0.001', ethToken);
    const result = calculateBurnRate(sellPrice, 1, 1);
    // burnForOneNeighbor(0.001) = 0.001 * 2 * 5 / (8 * 100) = 0.0000125
    expect(result.toNumber()).toBeCloseTo(0.0000125, 10);
  });
});

describe('calculateTaxes edge cases', () => {
  it('should scale linearly with sell amount', () => {
    const tax100 = calculateTaxes(100);
    const tax200 = calculateTaxes(200);
    expect(tax200).toBeCloseTo(tax100 * 2, 10);
  });

  it('should handle Infinity', () => {
    const result = calculateTaxes(Infinity);
    expect(result).toBe(Infinity);
  });
});

describe('burnForOneNeighbor with custom maxN', () => {
  const ethToken = mockToken();

  it('should use default maxN=8 when not provided', () => {
    const sellPrice = CurrencyAmount.fromScaled('100', ethToken);
    // 100 * 2 * 5 / (8 * 100) = 1.25
    expect(burnForOneNeighbor(sellPrice).toNumber()).toBe(1.25);
  });

  it('should calculate higher per-neighbor rate for corner lands (maxN=3)', () => {
    const sellPrice = CurrencyAmount.fromScaled('100', ethToken);
    // 100 * 2 * 5 / (3 * 100) = 1000/300 ≈ 3.333...
    const result = burnForOneNeighbor(sellPrice, 3);
    expect(result.toNumber()).toBeCloseTo((100 * 2 * 5) / (3 * 100), 10);
  });

  it('should calculate higher per-neighbor rate for edge lands (maxN=5)', () => {
    const sellPrice = CurrencyAmount.fromScaled('100', ethToken);
    // 100 * 2 * 5 / (5 * 100) = 2.0
    expect(burnForOneNeighbor(sellPrice, 5).toNumber()).toBe(2.0);
  });

  it('should show corner land pays more per neighbor than interior', () => {
    const sellPrice = CurrencyAmount.fromScaled('100', ethToken);
    const cornerRate = burnForOneNeighbor(sellPrice, 3).toNumber();
    const edgeRate = burnForOneNeighbor(sellPrice, 5).toNumber();
    const interiorRate = burnForOneNeighbor(sellPrice, 8).toNumber();

    // Corner > edge > interior per-neighbor rate
    expect(cornerRate).toBeGreaterThan(edgeRate);
    expect(edgeRate).toBeGreaterThan(interiorRate);

    // But total burn (rate * maxN) is the same for all positions
    expect(cornerRate * 3).toBeCloseTo(edgeRate * 5, 10);
    expect(edgeRate * 5).toBeCloseTo(interiorRate * 8, 10);
  });
});

describe('calculateBurnRate with location (edge/corner awareness)', () => {
  const ethToken = mockToken();

  // Helper matching contracts/src/helpers/coord.cairo::position_to_index
  function positionToIndex(row: number, col: number): number {
    return row * 256 + col;
  }

  it('should use maxN=8 when no location provided (backward compat)', () => {
    const sellPrice = CurrencyAmount.fromScaled('100', ethToken);
    // burnForOneNeighbor(100, 8) = 1.25, * 4 neighbors = 5
    const result = calculateBurnRate(sellPrice, 1, 4);
    expect(result.toNumber()).toBe(5);
  });

  it('should use maxN=8 for interior location', () => {
    const sellPrice = CurrencyAmount.fromScaled('100', ethToken);
    const interior = positionToIndex(5, 5); // row=5, col=5 → 8 neighbors
    const result = calculateBurnRate(sellPrice, 1, 4, interior);
    // Same as without location for interior lands
    expect(result.toNumber()).toBe(5);
  });

  it('should use maxN=5 for edge location', () => {
    const sellPrice = CurrencyAmount.fromScaled('100', ethToken);
    const topEdge = positionToIndex(0, 5); // row=0, col=5 → 5 neighbors
    // burnForOneNeighbor(100, 5) = 100 * 2 * 5 / (5 * 100) = 2.0
    // result = 2.0 * 4 = 8.0
    const result = calculateBurnRate(sellPrice, 1, 4, topEdge);
    expect(result.toNumber()).toBe(8);
  });

  it('should use maxN=3 for corner location', () => {
    const sellPrice = CurrencyAmount.fromScaled('100', ethToken);
    const corner = positionToIndex(0, 0); // row=0, col=0 → 3 neighbors
    // burnForOneNeighbor(100, 3) = 100 * 2 * 5 / (3 * 100) ≈ 3.333...
    // result = 3.333... * 3 = 10
    const result = calculateBurnRate(sellPrice, 1, 3, corner);
    expect(result.toNumber()).toBeCloseTo(10, 10);
  });

  it('should produce higher total burn rate for corner land vs interior with same actual neighbors', () => {
    const sellPrice = CurrencyAmount.fromScaled('100', ethToken);
    const corner = positionToIndex(0, 0);
    const interior = positionToIndex(5, 5);

    // Corner with 3 actual neighbors
    const cornerRate = calculateBurnRate(sellPrice, 1, 3, corner).toNumber();
    // Interior with 3 actual neighbors (theoretically, most are empty)
    const interiorRate = calculateBurnRate(
      sellPrice,
      1,
      3,
      interior,
    ).toNumber();

    // Corner rate should be higher because maxN=3 vs maxN=8
    expect(cornerRate).toBeGreaterThan(interiorRate);
  });

  it('should produce same total burn when all geometric neighbors are occupied', () => {
    const sellPrice = CurrencyAmount.fromScaled('100', ethToken);
    const corner = positionToIndex(0, 0); // maxN=3
    const edge = positionToIndex(0, 5); // maxN=5
    const interior = positionToIndex(5, 5); // maxN=8

    // All geometric neighbors occupied:
    const cornerRate = calculateBurnRate(sellPrice, 1, 3, corner).toNumber();
    const edgeRate = calculateBurnRate(sellPrice, 1, 5, edge).toNumber();
    const interiorRate = calculateBurnRate(
      sellPrice,
      1,
      8,
      interior,
    ).toNumber();

    // Total burn should be the same: sellPrice * taxRate * gameSpeed / 100
    // = 100 * 2 * 5 / 100 = 10
    expect(cornerRate).toBeCloseTo(10, 10);
    expect(edgeRate).toBeCloseTo(10, 10);
    expect(interiorRate).toBeCloseTo(10, 10);
  });
});
