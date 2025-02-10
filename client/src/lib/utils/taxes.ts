import type { LandWithActions } from '$lib/api/land.svelte';
import type { LandYieldInfo, Token } from '$lib/interfaces';
import { CurrencyAmount } from './CurrencyAmount';
import data from '$lib/data.json';
import { Redo } from 'lucide-svelte';
import { MAP_SIZE } from '$lib/api/tile-store.svelte';
import { toHexWithPadding } from '$lib/utils';
import { GAME_SPEED } from '$lib/const';
export type TaxData = {
  tokenAddress: string;
  tokenSymbol: string;
  totalTax: CurrencyAmount;
};

export const getAggregatedTaxes = async (
  land: LandWithActions,
): Promise<{
  nukable: string[];
  taxes: TaxData[];
}> => {
  if (!land || !land.getNextClaim || !land.getPendingTaxes) {
    return {
      nukable: [],
      taxes: [],
    };
  }

  const locationsToNuke: string[] = [];

  // aggregate the two arrays with total tax per token
  const tokenTaxMap: Record<string, CurrencyAmount> = {};

  for (const tax of (await land.getNextClaim()) ?? []) {
    if (tax.canBeNuked) {
      locationsToNuke.push(tax.landLocation);
    }

    if (tax.amount.isZero()) {
      continue;
    }

    const token: Token | undefined = data.availableTokens.find(
      (t) => t.address == tax.tokenAddress,
    );

    const tokenAddress = token?.address ?? tax.tokenAddress;

    tokenTaxMap[tokenAddress] = (
      tokenTaxMap[tokenAddress] || CurrencyAmount.fromScaled(0, token)
    ).add(tax.amount);
  }

  for (const tax of (await land.getPendingTaxes()) ?? []) {
    if (tax.amount.isZero()) {
      continue;
    }

    const token: Token | undefined = data.availableTokens.find(
      (t) => t.address == tax.tokenAddress,
    );

    const tokenAddress = token?.address ?? tax.tokenAddress;

    tokenTaxMap[tokenAddress] = (
      tokenTaxMap[tokenAddress] || CurrencyAmount.fromScaled(0, token)
    ).add(tax.amount);
  }

  const taxes = Object.entries(tokenTaxMap).map(([tokenAddress, totalTax]) => {
    const token: Token | undefined = data.availableTokens.find(
      (t) => t.address == tokenAddress,
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
    nukable: locationsToNuke,
  };
};

export const getNeighbourYieldArray = async (land: LandWithActions) => {
  const rawYieldInfos = await land.getYieldInfo();

  const location = Number(land.location);
  const neighbors = [
    location - MAP_SIZE - 1,
    location - MAP_SIZE,
    location - MAP_SIZE + 1,
    location - 1,
    location,
    location + 1,
    location + MAP_SIZE - 1,
    location + MAP_SIZE,
    location + MAP_SIZE + 1,
  ];

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
    const token = data.availableTokens.find((t) => t.address == tokenAddress);

    return {
      ...info,
      token,
    };
  });

  const infosFormatted = neighborYieldInfo.sort((a, b) => {
    return Number((a?.location ?? 0n) - (b?.location ?? 0n));
  });
  console.log('yield info:', infosFormatted);

  return infosFormatted;
};

export const estimateNukeTime = (
  sellPrice: number,
  remainingStake: number,
  neighbourNumber: number,
) => {
  console.log(
    'estimating nuke time',
    sellPrice,
    remainingStake,
    neighbourNumber,
  );

  const gameSpeed = GAME_SPEED;
  const taxRate = 0.02;
  const baseTime = 3600;
  const maxNeighbours = 8;

  const maxRate = sellPrice * taxRate * gameSpeed;
  const maxRatePerNeighbour = maxRate / maxNeighbours;
  const rateOfActualNeighbours = maxRatePerNeighbour * neighbourNumber;

  const remainingHours = remainingStake / rateOfActualNeighbours;
  const remainingSeconds = remainingHours * baseTime;

  console.log('estimated seconds', remainingSeconds);
  return remainingSeconds;
};
