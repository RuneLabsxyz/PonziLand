import type { LandWithActions } from '$lib/api/land.svelte';
import type { Token } from '$lib/interfaces';
import { CurrencyAmount } from './CurrencyAmount';
import data from '$lib/data.json';
import { Redo } from 'lucide-svelte';
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
      tokenSymbol: token?.name ?? 'Unknown',
      totalTax: totalTax,
    };
  });

  // Convert the map to an array of objects
  return {
    taxes,
    nukable: locationsToNuke,
  };
};
