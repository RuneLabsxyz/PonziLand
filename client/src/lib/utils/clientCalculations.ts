/**
 * Client-side calculations to reduce RPC calls
 *
 * This module ports Cairo contract logic to JavaScript to calculate
 * auction prices and taxes locally instead of making RPC calls.
 *
 */

import { configValues } from '$lib/stores/config.store.svelte';

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
