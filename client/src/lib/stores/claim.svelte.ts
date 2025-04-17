import { type LandWithActions } from '$lib/api/land.svelte';
import { useDojo } from '$lib/contexts/dojo';
import type { Token } from '$lib/interfaces';
import { getTokenInfo } from '$lib/utils';
import { getAggregatedTaxes } from '$lib/utils/taxes';
import type { BigNumberish } from 'ethers';
import type { Account, AccountInterface } from 'starknet';
import { claimQueue } from './event.store.svelte';
import { notificationQueue } from '$lib/stores/event.store.svelte';

export let claimStore: {
  value: {
    [key: string]: {
      lastClaimTime: number;
      claimable: boolean;
      animating: boolean;
      land: LandWithActions;
    };
  };
} = $state({ value: {} });

export async function claimAllOfToken(
  token: Token,
  { client: sdk, accountManager }: ReturnType<typeof useDojo>,
  account: Account | AccountInterface,
) {
  // get all the lands with the same token
  const landsWithThisToken = Object.values(claimStore.value)
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
      landsWithThisToken.map((land) => land.location as BigNumberish),
    )
    .then(() => {
      // update the last claim time for all the lands
      landsWithThisToken.forEach((land) => {
        claimStore.value[land.location].lastClaimTime = Date.now();
        claimStore.value[land.location].animating = true;
        claimStore.value[land.location].claimable = false;
      });

      setTimeout(() => {
        landsWithThisToken.forEach((land) => {
          claimStore.value[land.location].animating = false;
        });
      }, 2000);

      setTimeout(() => {
        landsWithThisToken.forEach((land) => {
          if (land.type === 'house') {
            claimStore.value[land.location].claimable = true;
          }
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

export async function claimSingleLand(
  land: LandWithActions,
  { client: sdk, accountManager }: ReturnType<typeof useDojo>,
  account: Account | AccountInterface,
) {
  const result = await getAggregatedTaxes(land);

  await sdk.client.actions
    .claim(account, land.location as BigNumberish)
    .then((value) => {
      notificationQueue.addNotification(value.transaction_hash, 'claim');

      claimStore.value[land.location].lastClaimTime = Date.now();
      claimStore.value[land.location].animating = true;
      claimStore.value[land.location].claimable = false;

      setTimeout(() => {
        claimStore.value[land.location].animating = false;
      }, 2000);

      setTimeout(() => {
        if (land.type === 'house') {
          claimStore.value[land.location].claimable = true;
        }
      }, 30 * 1000);

      claimQueue.update((queue) => {
        return [
          ...queue,
          ...result.taxes.map((tax) => {
            const token = getTokenInfo(tax.tokenAddress);
            tax.totalTax.setToken(token);
            return tax.totalTax;
          }),
        ];
      });
    });
}
