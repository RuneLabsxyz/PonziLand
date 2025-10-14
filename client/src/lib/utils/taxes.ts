import type { LandWithActions } from '$lib/api/land';
import { Neighbors } from '$lib/api/neighbors';
import { configValues } from '$lib/stores/config.store.svelte';
import type { Token } from '$lib/interfaces';
import { toHexWithPadding, padAddress } from '$lib/utils';
import data from '$profileData';
import { CurrencyAmount } from './CurrencyAmount';
export type TaxData = {
  tokenAddress: string;
  tokenSymbol: string;
  totalTax: CurrencyAmount;
};

export const getAggregatedTaxes = async (
  land: LandWithActions,
): Promise<{
  nukables: { location: string; nukable: boolean }[];
  taxes: TaxData[];
}> => {
  if (!land || !land.getNextClaim) {
    return {
      nukables: [],
      taxes: [],
    };
  }

  const locationsToNuke: { location: string; nukable: boolean }[] = [];

  // aggregate the two arrays with total tax per token
  const tokenTaxMap: Record<string, CurrencyAmount> = {};

  for (const tax of (await land.getNextClaim()) ?? []) {
    locationsToNuke.push({
      location: tax.landLocation,
      nukable: tax.canBeNuked,
    });

    if (tax.amount.isZero()) {
      continue;
    }

    const token: Token | undefined = data.availableTokens.find(
      (t) => padAddress(t.address) === padAddress(tax.tokenAddress),
    );

    const tokenAddress = token?.address ?? tax.tokenAddress;

    tokenTaxMap[tokenAddress] = (
      tokenTaxMap[tokenAddress] || CurrencyAmount.fromScaled(0, token)
    ).add(tax.amount);
  }

  const taxes = Object.entries(tokenTaxMap).map(([tokenAddress, totalTax]) => {
    const token: Token | undefined = data.availableTokens.find(
      (t) => padAddress(t.address) === padAddress(tokenAddress),
    );

    return {
      tokenAddress: tokenAddress,
      tokenSymbol: token?.symbol ?? '???',
      totalTax: totalTax,
    };
  });

  // Convert the map to an array of objects
  return {
    taxes,
    nukables: locationsToNuke,
  };
};

export const getNeighbourYieldArray = async (
  land: LandWithActions,
  useRpcForExactCalculation: boolean = false,
) => {
  const rawYieldInfos = await land.getYieldInfo(useRpcForExactCalculation);

  const location = Number(land.location);
  // Use existing neighbors function instead of duplicating coordinate logic
  const neighborsData = Neighbors.getLocations(BigInt(location));
  const neighbors = neighborsData.array.map((loc) => Number(loc));

  // assign yield info to neighbour if location matches
  const neighborYieldInfo = neighbors.map((loc) => {
    const info = rawYieldInfos?.yield_info.find(
      (y) => y.location == BigInt(loc),
    );

    if (!info?.percent_rate) {
      return {
        ...info,
        token: undefined,
        location: BigInt(loc),
        sell_price: 0n,
        percent_rate: 0n,
        per_hour: 0n,
      };
    }

    const tokenAddress = toHexWithPadding(info?.token);
    const token = data.availableTokens.find(
      (t) => padAddress(t.address) === padAddress(tokenAddress),
    );

    return {
      ...info,
      token,
    };
  });

  const infosFormatted = neighborYieldInfo.sort((a, b) => {
    return Number((a?.location ?? 0n) - (b?.location ?? 0n));
  });

  return infosFormatted;
};

export const estimateNukeTime = async (
  land: LandWithActions,
  neighbourNumber?: number,
) => {
  const baseTime = configValues.baseTime;
  const sellPrice = land.sellPrice.rawValue().toNumber();
  const remainingStake = land.stakeAmount.rawValue().toNumber();
  const buyDate = land.block_date_bought;

  // Get actual neighbor count if not provided
  neighbourNumber ??= land.getNeighbors().getBaseLandsArray().length;

  // Early returns for invalid cases
  if (sellPrice <= 0 || isNaN(sellPrice) || neighbourNumber === 0) {
    return 0;
  }

  const burnRate = Number(
    calculateBurnRate(land.sellPrice, land.level, neighbourNumber),
  );

  if (burnRate <= 0) {
    return 0;
  }

  // Calculate base nuke time in seconds
  const remainingSeconds = (remainingStake / burnRate) * baseTime;

  // Get elapsed times for all neighbors
  const elapsedTimesOfNeighbors =
    await land.getElapsedTimeSinceLastClaimForNeighbors();

  if (!elapsedTimesOfNeighbors?.length) {
    return remainingSeconds;
  }

  // Find the minimum elapsed time (most recent claim)
  const minElapsedTime = Math.min(
    ...elapsedTimesOfNeighbors.map((neighbor) => Number(neighbor[1])),
  );

  // Calculate how long since the land was purchased
  const currentTime = Math.floor(Date.now() / 1000);
  const landAge = currentTime - Number(buyDate);

  // Use the smaller of: neighbor's elapsed time OR land age
  // (Can't owe taxes from before you owned the land)
  const relevantElapsedTime = Math.min(minElapsedTime, landAge);

  return Math.max(0, Math.floor(remainingSeconds - relevantElapsedTime));
};

export const parseNukeTime = (givenTime: number) => {
  const time = givenTime / 60; // Convert seconds to minutes

  // Convert minutes (bigint) to days, hours, minutes, and seconds
  const minutes = Math.floor(time % 60);
  const hours = Math.floor((time / 60) % 24);
  const days = Math.floor(time / 1440); // 1440 minutes in a day

  // Build the formatted string
  const parts: string[] = [];

  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0)
    parts.push(`${hours.toString().padStart(2, '0')}h`);
  if (minutes > 0 || hours > 0 || days > 0)
    parts.push(`${minutes.toString().padStart(2, '0')}m`);

  return {
    minutes,
    hours,
    days,
    toString: () => parts.join(' '),
  };
};

export const estimateTax = (sellPrice: number) => {
  if (sellPrice <= 0 || isNaN(sellPrice)) {
    return {
      taxRate: 0,
      baseTime: 0,
      maxRate: 0,
      ratePerNeighbour: 0,
    };
  }

  const gameSpeed = configValues.gameSpeed;
  const taxRate = configValues.taxRate;
  const baseTime = configValues.baseTime;
  const maxNeighbours = 8;

  const maxRate = sellPrice * taxRate * gameSpeed;
  const maxRatePerNeighbour = maxRate / maxNeighbours;

  return {
    taxRate,
    baseTime,
    maxRate,
    ratePerNeighbour: maxRatePerNeighbour,
  };
};

export function burnForOneNeighbor(sellPrice: CurrencyAmount) {
  const maxN = 8;
  return sellPrice
    .rawValue()
    .multipliedBy(configValues.taxRate)
    .multipliedBy(configValues.gameSpeed)
    .dividedBy(maxN * 100);
}

// TODO: edge case land in the corners or edges of the map
export function calculateBurnRate(
  sellPrice: CurrencyAmount,
  level: number,
  neighborCount: number,
) {
  const discount_for_level = calculateDiscount(level);

  let base = burnForOneNeighbor(sellPrice).multipliedBy(neighborCount);

  if (discount_for_level > 0) {
    return base.multipliedBy(100 - discount_for_level).dividedBy(100);
  } else {
    return base;
  }
}

/**
 * Calculates the tax amount based on the provided sell amount.
 *
 * The tax is computed using the configured tax rate and game speed,
 * divided by a constant factor. If the sell amount is less than or equal
 * to zero, or not a valid number, the function returns 0.
 *
 * @param sellAmount - The amount to be sold, used as the basis for tax calculation.
 * @returns The calculated tax amount, or 0 if the input is invalid.
 */
export function calculateTaxes(sellAmount: number) {
  const taxRate = configValues.taxRate;
  const gameSpeed = configValues.gameSpeed;
  const maxN = 8;

  if (sellAmount <= 0 || isNaN(sellAmount)) {
    return 0;
  }

  const taxes = (sellAmount * taxRate * gameSpeed) / (maxN * 100);

  return taxes;
}

function calculateDiscount(level: number) {
  if (level == 1) {
    return 0;
  } else if (level == 2) {
    return 10;
  } else if (level == 3) {
    return 15;
  }
  return 0;
}
