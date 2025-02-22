import type { LandWithActions } from '$lib/api/land.svelte';
import { useDojo } from '$lib/contexts/dojo';
import type { Token } from '$lib/interfaces';
import type { Account, AccountInterface } from 'starknet';
import { claimQueue } from './event.store.svelte';
import { getAggregatedTaxes } from '$lib/utils/taxes';
import { getTokenInfo } from '$lib/utils';

export let claims: {
  [key: string]: {
    lastClaimTime: number;
    claimable: boolean;
    animating: boolean;
    land: LandWithActions;
  };
} = $state({});

export async function claimAllOfToken(
  token: Token,
  { client: sdk, accountManager }: ReturnType<typeof useDojo>,
  account: Account | AccountInterface,
) {
  // get all the lands with the same token
  const landsWithThisToken = Object.values(claims)
    .filter((claim) => claim.land.token?.address === token.address)
    .map((claim) => claim.land);

  const aggregatedTaxes = await Promise.all(
    landsWithThisToken.map(async (land) => {
      const result = await getAggregatedTaxes(land);
      return result.taxes;
    }),
  );

  // call claim multicall to claim all the tokens at once
  await sdk.client.actions
    .claimAll(
      account,
      landsWithThisToken.map((land) => land.location),
    )
    .then(() => {
      // update the last claim time for all the lands
      landsWithThisToken.forEach((land) => {
        claims[land.location].lastClaimTime = Date.now();
        claims[land.location].animating = true;
        claims[land.location].claimable = false;
      });

      setTimeout(() => {
        landsWithThisToken.forEach((land) => {
          claims[land.location].animating = false;
        });
      }, 2000);

      setTimeout(() => {
        landsWithThisToken.forEach((land) => {
          claims[land.location].claimable = true;
        });
      }, 30 * 1000);

      claimQueue.update((queue) => {
        return [
          ...queue,
          ...aggregatedTaxes.flatMap((taxData) => {
            return taxData.map((tax) => {
              const token = getTokenInfo(tax.tokenAddress);
              tax.totalTax.setToken(token);
              console.log('total tax when updating queue', tax.totalTax);
              return tax.totalTax;
            });
          }),
        ];
      });
    });
}
