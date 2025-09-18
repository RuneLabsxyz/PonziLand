/**
 * Client-side calculations to reduce RPC calls
 *
 * This module ports Cairo contract logic to JavaScript to calculate
 * auction prices and taxes locally instead of making RPC calls.
 *
 */

import { configValues } from '$lib/stores/config.store.svelte';
import type { LandYieldInfo, YieldInfo } from '$lib/interfaces';
import type { BaseLand } from '$lib/api/land';
import { calculateBurnRate } from './taxes';
import { CurrencyAmount } from './CurrencyAmount';

// Constants from contracts/src/consts.cairo
const DECIMALS_FACTOR = BigInt('1000000000000000000'); // 1e18

/**
 * Calculate current auction price with decay
 *
 * @param startTimeSeconds Auction start time in seconds
 * @param startPrice Starting price as string or BigNumberish
 * @param floorPrice Floor price as string or BigNumberish
 * @returns Current price as BigInt
 */
export function calculateAuctionPrice(
  startTimeSeconds: number,
  startPrice: bigint,
  floorPrice: bigint,
): bigint {
  const currentTime = BigInt(Math.floor(Date.now() / 1000)); // Convert to seconds to match contract
  const startTime = BigInt(startTimeSeconds);

  // Calculate raw time difference first
  const rawTimeDiff =
    currentTime > startTime ? currentTime - startTime : BigInt(0);

  // Apply game speed to get accelerated time
  const timePassed = rawTimeDiff * BigInt(configValues.gameSpeed);

  const startPriceBig = startPrice;
  const floorPriceBig = floorPrice;

  // If auction duration has passed, return floor price (not 0)
  if (timePassed >= BigInt(configValues.auctionDuration)) {
    return BigInt(0);
  }

  let currentPrice = startPriceBig;
  const linearDecayTime = BigInt(configValues.linearDecayTime);
  const dropRate = BigInt(configValues.dropRate);
  const rateDenominator = BigInt(configValues.rateDenominator);
  const decayRate = BigInt(configValues.decayRate);
  const scalingFactor = BigInt(configValues.scalingFactor);
  // Phase 1: Linear decay (first 10 minutes IRL)
  if (timePassed <= linearDecayTime) {
    const timeFraction = (timePassed * DECIMALS_FACTOR) / linearDecayTime;
    const linearFactor =
      DECIMALS_FACTOR - (dropRate * timeFraction) / rateDenominator;
    currentPrice = (startPriceBig * linearFactor) / DECIMALS_FACTOR;
  }
  // Phase 2: Exponential decay
  else {
    const remainingRate = rateDenominator - dropRate;
    const priceAfterLinear = (startPriceBig * remainingRate) / rateDenominator;
    const progressTime =
      (timePassed * DECIMALS_FACTOR) / BigInt(configValues.auctionDuration);
    const k = (decayRate * DECIMALS_FACTOR) / scalingFactor;

    const denominator = DECIMALS_FACTOR + (k * progressTime) / DECIMALS_FACTOR;

    // Match Cairo implementation exactly: temp = (1e18 * 1e18) / denominator, then (temp * temp) / 1e18
    const decayFactor =
      denominator !== BigInt(0)
        ? (() => {
            const temp = (DECIMALS_FACTOR * DECIMALS_FACTOR) / denominator;
            return (temp * temp) / DECIMALS_FACTOR;
          })()
        : BigInt(0);

    currentPrice = (priceAfterLinear * decayFactor) / DECIMALS_FACTOR;
  }

  return currentPrice > floorPriceBig ? currentPrice : floorPriceBig;
}

/**
 * Calculate yield information for a land's neighbors client-side
 * Replicates the Cairo contract's get_neighbors_yield function
 *
 * @param neighbors Array of neighbor lands (already filtered by the calling context)
 * @returns LandYieldInfo object matching RPC response format
 */
export function calculateYieldInfo(
  neighbors: BaseLand[],
): LandYieldInfo | undefined {
  if (!neighbors) {
    return undefined;
  }

  try {
    const taxRate = BigInt(configValues.taxRate);
    const gameSpeed = BigInt(configValues.gameSpeed);

    // Calculate rate as per Cairo contract: tax_rate * time_speed / 8
    const rate = (taxRate * gameSpeed) / BigInt(8);
    let neighborYields: YieldInfo[] = [];
    // Create yield info for each neighbor land
    neighbors.forEach((neighborLand) => {
      const location = BigInt(neighborLand.locationString);
      const tokenAddress = neighborLand.token.address;

      // Use the existing tax calculation logic from taxes.ts
      // This replicates get_tax_rate_per_neighbor from the contract
      const perHourBigNumber = calculateBurnRate(
        neighborLand.sellPrice,
        neighborLand.level,
        1,
      );
      // Convert BigNumber to BigInt
      const perHour = CurrencyAmount.fromRaw(
        perHourBigNumber,
        neighborLand.token,
      ).toBigint();

      const sellPrice = neighborLand.sellPrice.toBigint();

      neighborYields.push({
        token: BigInt(tokenAddress),
        sell_price: sellPrice,
        per_hour: perHour,
        percent_rate: rate,
        location: location,
      });
    });

    return {
      yield_info: neighborYields,
    };
  } catch (error) {
    console.warn('Failed to calculate yield info client-side:', error);
    return undefined;
  }
}
