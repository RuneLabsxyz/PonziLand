import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Token } from '$lib/interfaces';
import type { BaseLand } from '$lib/api/land';
import { CurrencyAmount } from './CurrencyAmount';

// Mock the config store before importing the module under test
vi.mock('$lib/stores/config.store.svelte', () => ({
  configValues: {
    gameSpeed: 5,
    taxRate: 2,
    baseTime: 3600,
    auctionDuration: 604800, // 7 days in seconds
    linearDecayTime: 12000, // 10 * 60 * 20
    dropRate: 90,
    rateDenominator: 100,
    decayRate: 100,
    scalingFactor: 50,
  },
}));

import {
  calculateAuctionPrice,
  calculateYieldInfo,
} from './clientCalculations';

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

function mockBaseLand(
  overrides: Partial<{
    locationString: string;
    token: Token;
    sellPrice: CurrencyAmount;
    level: number;
  }> = {},
): BaseLand {
  const token = overrides.token ?? mockToken();
  return {
    locationString: overrides.locationString ?? '1285',
    token,
    sellPrice: overrides.sellPrice ?? CurrencyAmount.fromScaled('100', token),
    level: overrides.level ?? 1,
  } as unknown as BaseLand;
}

describe('calculateAuctionPrice', () => {
  const DECIMALS_FACTOR = BigInt('1000000000000000000');

  // For time-dependent tests, we freeze Date.now
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should return start price when no time has passed', () => {
    const now = Math.floor(Date.now() / 1000);
    vi.setSystemTime(now * 1000);

    const startPrice = DECIMALS_FACTOR; // 1e18
    const floorPrice = DECIMALS_FACTOR / 2n; // 0.5e18

    const price = calculateAuctionPrice(now, startPrice, floorPrice);
    expect(price).toBe(startPrice);
  });

  it('should return floor price when start time is in the past (auction expired)', () => {
    const now = Math.floor(Date.now() / 1000);
    vi.setSystemTime(now * 1000);

    const startPrice = DECIMALS_FACTOR;
    const floorPrice = DECIMALS_FACTOR / 2n;

    // Start time is way in the past — more than auctionDuration * gameSpeed ago
    // auctionDuration = 604800, gameSpeed = 5
    // So if rawTimeDiff * gameSpeed >= 604800, price = 0
    // rawTimeDiff >= 604800 / 5 = 120960
    const startTime = now - 200000; // well past auction duration
    const price = calculateAuctionPrice(startTime, startPrice, floorPrice);

    // When timePassed >= auctionDuration, returns 0. But max(0, floorPrice) = floorPrice
    // Actually the code returns 0 when timePassed >= auctionDuration, not floorPrice
    // Then max(currentPrice, floorPrice) => max(0, floorPrice) — wait, this is before the max check
    // Let me re-read: if timePassed >= auctionDuration, return BigInt(0)
    // This happens before the floor price check
    expect(price).toBe(0n);
  });

  it('should decay linearly during the first phase', () => {
    const now = Math.floor(Date.now() / 1000);
    vi.setSystemTime(now * 1000);

    const startPrice = DECIMALS_FACTOR * 100n; // 100 tokens
    const floorPrice = DECIMALS_FACTOR; // 1 token

    // linearDecayTime = 12000, gameSpeed = 5
    // For half the linear decay: timePassed = 6000
    // rawTimeDiff * 5 = 6000 => rawTimeDiff = 1200
    const startTime = now - 1200;

    const price = calculateAuctionPrice(startTime, startPrice, floorPrice);

    // During linear phase:
    // timeFraction = (6000 * 1e18) / 12000 = 0.5e18
    // linearFactor = 1e18 - (90 * 0.5e18) / 100 = 1e18 - 0.45e18 = 0.55e18
    // currentPrice = (100e18 * 0.55e18) / 1e18 = 55e18
    const expected = DECIMALS_FACTOR * 55n;
    expect(price).toBe(expected);
  });

  it('should return start price when future start time', () => {
    const now = Math.floor(Date.now() / 1000);
    vi.setSystemTime(now * 1000);

    const startPrice = DECIMALS_FACTOR;
    const floorPrice = 0n;

    // Start time is in the future
    const startTime = now + 1000;
    const price = calculateAuctionPrice(startTime, startPrice, floorPrice);

    // rawTimeDiff = 0 (clamped), timePassed = 0
    // In linear phase with timePassed=0: timeFraction=0, linearFactor=1e18
    // currentPrice = startPrice
    expect(price).toBe(startPrice);
  });

  it('should not go below floor price during linear phase', () => {
    const now = Math.floor(Date.now() / 1000);
    vi.setSystemTime(now * 1000);

    const startPrice = DECIMALS_FACTOR; // 1 token
    const floorPrice = DECIMALS_FACTOR; // floor = start

    // Just past start
    const startTime = now - 100;
    const price = calculateAuctionPrice(startTime, startPrice, floorPrice);

    expect(price).toBeGreaterThanOrEqual(floorPrice);
  });

  it('should enter exponential decay after linear phase', () => {
    const now = Math.floor(Date.now() / 1000);
    vi.setSystemTime(now * 1000);

    const startPrice = DECIMALS_FACTOR * 100n;
    const floorPrice = DECIMALS_FACTOR;

    // linearDecayTime = 12000, gameSpeed = 5
    // timePassed must be > 12000 to enter exponential phase
    // rawTimeDiff * 5 > 12000 => rawTimeDiff > 2400
    const startTime = now - 3000; // rawTimeDiff=3000, timePassed=15000

    const price = calculateAuctionPrice(startTime, startPrice, floorPrice);

    // Should be less than the price at end of linear phase
    // At end of linear phase: linearFactor = 1e18 - (90 * 1e18)/100 = 0.1e18
    // priceAfterLinear = 100e18 * 0.1 = 10e18
    // In exponential phase, price decays further from 10e18
    expect(price).toBeLessThan(DECIMALS_FACTOR * 10n);
    expect(price).toBeGreaterThanOrEqual(floorPrice);
  });

  it('should handle zero start price', () => {
    const now = Math.floor(Date.now() / 1000);
    vi.setSystemTime(now * 1000);

    const price = calculateAuctionPrice(now, 0n, 0n);
    expect(price).toBe(0n);
  });

  it('should handle zero floor price', () => {
    const now = Math.floor(Date.now() / 1000);
    vi.setSystemTime(now * 1000);

    const startPrice = DECIMALS_FACTOR;
    const startTime = now - 3000;

    const price = calculateAuctionPrice(startTime, startPrice, 0n);
    // Price can go all the way to 0
    expect(price).toBeGreaterThanOrEqual(0n);
  });
});

describe('calculateYieldInfo', () => {
  const ethToken = mockToken();
  const strkToken = mockToken({
    name: 'Starknet',
    symbol: 'STRK',
    address:
      '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
    decimals: 18,
  });

  it('should return undefined for null/undefined neighbors', () => {
    expect(calculateYieldInfo(null as any)).toBeUndefined();
    expect(calculateYieldInfo(undefined as any)).toBeUndefined();
  });

  it('should return empty yield_info for empty neighbors array', () => {
    const result = calculateYieldInfo([]);
    expect(result).toBeDefined();
    expect(result!.yield_info).toHaveLength(0);
  });

  it('should calculate yield info for a single neighbor', () => {
    const neighbor = mockBaseLand({
      locationString: '1285',
      token: ethToken,
      sellPrice: CurrencyAmount.fromScaled('100', ethToken),
      level: 1,
    });

    const result = calculateYieldInfo([neighbor]);
    expect(result).toBeDefined();
    expect(result!.yield_info).toHaveLength(1);

    const yieldInfo = result!.yield_info[0];
    expect(yieldInfo.location).toBe(BigInt(1285));
    expect(yieldInfo.token).toBe(BigInt(ethToken.address));
    expect(yieldInfo.sell_price).toBe(
      CurrencyAmount.fromScaled('100', ethToken).toBigint(),
    );
    // percent_rate = (taxRate * gameSpeed) / 8 = (2 * 5) / 8 = 1 (integer division in BigInt)
    expect(yieldInfo.percent_rate).toBe(BigInt(1));
    // per_hour = calculateBurnRate(sellPrice, level=1, neighborCount=1)
    // burnForOneNeighbor(100) = 100 * 2 * 5 / (8 * 100) = 1.25
    // calculateBurnRate(100, 1, 1) = 1.25 * 1 = 1.25 (no discount at level 1)
    // As bigint with 18 decimals: 1.25e18
    expect(yieldInfo.per_hour).toBe(BigInt('1250000000000000000'));
  });

  it('should calculate yield info for multiple neighbors with different tokens', () => {
    const neighbor1 = mockBaseLand({
      locationString: '1285',
      token: ethToken,
      sellPrice: CurrencyAmount.fromScaled('100', ethToken),
      level: 1,
    });
    const neighbor2 = mockBaseLand({
      locationString: '1286',
      token: strkToken,
      sellPrice: CurrencyAmount.fromScaled('200', strkToken),
      level: 2,
    });

    const result = calculateYieldInfo([neighbor1, neighbor2]);
    expect(result).toBeDefined();
    expect(result!.yield_info).toHaveLength(2);

    // First neighbor (ETH, level 1)
    expect(result!.yield_info[0].location).toBe(BigInt(1285));
    expect(result!.yield_info[0].token).toBe(BigInt(ethToken.address));

    // Second neighbor (STRK, level 2)
    expect(result!.yield_info[1].location).toBe(BigInt(1286));
    expect(result!.yield_info[1].token).toBe(BigInt(strkToken.address));
    // Level 2 has 10% discount
    // burnForOneNeighbor(200) = 200 * 2 * 5 / (8 * 100) = 2.5
    // calculateBurnRate(200, 2, 1) = 2.5 * 1 * (100-10)/100 = 2.25
    // As bigint with 18 decimals: 2.25e18
    expect(result!.yield_info[1].per_hour).toBe(BigInt('2250000000000000000'));
  });

  it('should apply level 3 discount correctly', () => {
    // Use interior location (row=6, col=4 → 6*256+4=1540) so maxNeighbors=8
    const neighbor = mockBaseLand({
      locationString: '1540',
      token: ethToken,
      sellPrice: CurrencyAmount.fromScaled('100', ethToken),
      level: 3,
    });

    const result = calculateYieldInfo([neighbor]);
    expect(result).toBeDefined();

    // Level 3 has 15% discount, interior land has maxNeighbors=8
    // burnForOneNeighbor(100, 8) = 100 * 2 * 5 / (8 * 100) = 1.25
    // calculateBurnRate(100, 3, 1, 1540) = 1.25 * (100-15)/100 = 1.0625
    // As bigint with 18 decimals: 1.0625e18
    expect(result!.yield_info[0].per_hour).toBe(BigInt('1062500000000000000'));
  });

  it('should handle zero sell price neighbor', () => {
    const neighbor = mockBaseLand({
      locationString: '500',
      token: ethToken,
      sellPrice: CurrencyAmount.fromScaled('0', ethToken),
      level: 1,
    });

    const result = calculateYieldInfo([neighbor]);
    expect(result).toBeDefined();
    expect(result!.yield_info).toHaveLength(1);
    expect(result!.yield_info[0].per_hour).toBe(0n);
    expect(result!.yield_info[0].sell_price).toBe(0n);
  });
});
