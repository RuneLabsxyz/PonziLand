import { type LandWithActions } from '$lib/api/land';
import { useDojo } from '$lib/contexts/dojo';
import type { Token } from '$lib/interfaces';
import { getTokenInfo, padAddress } from '$lib/utils';
import { getAggregatedTaxes, type TaxData } from '$lib/utils/taxes';
import type { BigNumberish } from 'ethers';
import type { Account, AccountInterface } from 'starknet';
import { nukeStore } from './nuke.store.svelte';
import { notificationQueue } from '$lib/stores/event.svelte';
import type { CurrencyAmount } from '$lib/utils/CurrencyAmount';
import { SvelteMap } from 'svelte/reactivity';

export type ClaimEvent = CurrencyAmount;

export class ClaimForToken {
  private events: CurrencyAmount[] = $state([]);

  constructor(events: CurrencyAmount[]) {
    this.events = events;
  }

  public add(event: CurrencyAmount) {
    this.events.push(event);
  }

  public get current(): CurrencyAmount | undefined {
    return $derived(this.events[0]);
  }

  public next(): CurrencyAmount | undefined {
    return this.events.shift();
  }
}

export class ClaimQueue {
  private perTokenQueue = new SvelteMap<string, ClaimForToken>();

  public addAll(claimEvent: ClaimEvent[]) {
    claimEvent.forEach((claimEvent) => {
      const tokenAddress = claimEvent.getToken()?.address;

      if (!tokenAddress) return;

      const tokenQueue =
        this.perTokenQueue.get(tokenAddress) || new ClaimForToken([]);
      tokenQueue.add(claimEvent);
      this.perTokenQueue.set(tokenAddress, tokenQueue);
    });
  }

  public get(tokenAddress: string): ClaimForToken | undefined {
    return this.perTokenQueue.get(tokenAddress);
  }
}

export const claimQueue = new ClaimQueue();

export type ClaimResult = {
  nukables: {
    location: string;
    nukable: boolean;
  }[];
  taxes: TaxData[];
};

export const claimStore: {
  value: {
    [key: string]: {
      claimable: boolean;
      animating: boolean;
      land: LandWithActions;
    };
  };
} = $state({ value: {} });

export async function claimAll(
  { client: sdk }: ReturnType<typeof useDojo>,
  account: Account | AccountInterface,
) {
  const playerLandsToClaim = Object.values(claimStore.value)
    .filter((claim) => claim.land.owner === padAddress(account.address))
    .map((claim) => claim.land);

  const landsToClaim: LandWithActions[][] = [];
  for (let i = 0; i < playerLandsToClaim.length; i += 10) {
    landsToClaim.push(playerLandsToClaim.slice(i, i + 10));
  }
  for (const batch of landsToClaim) {
    const batchAggregatedTaxes = await Promise.all(
      batch.map(async (land) => {
        const result = await getAggregatedTaxes(land);
        return result;
      }),
    );

    await sdk.client.actions
      .claimAll(
        account,
        batch.map((land) => land.location as BigNumberish),
      )
      .then((value) => {
        batchAggregatedTaxes.forEach((result) => {
          handlePostClaim(batch, result, value.transaction_hash);
        });
      });
  }
}

export async function claimAllOfToken(
  token: Token,
  { client: sdk }: ReturnType<typeof useDojo>,
  account: Account | AccountInterface,
) {
  const landsWithThisToken = Object.values(claimStore.value)
    .filter((claim) => claim.land.token?.address === token.address)
    .filter((claim) => claim.land.owner === padAddress(account.address))
    .map((claim) => claim.land);

  const landsToClaim: LandWithActions[][] = [];
  for (let i = 0; i < landsWithThisToken.length; i += 10) {
    landsToClaim.push(landsWithThisToken.slice(i, i + 10));
  }

  for (const batch of landsToClaim) {
    const batchAggregatedTaxes = await Promise.all(
      batch.map(async (land) => {
        const result = await getAggregatedTaxes(land);
        return result;
      }),
    );

    await sdk.client.actions
      .claimAll(
        account,
        batch.map((land) => land.location as BigNumberish),
      )
      .then((value) => {
        batchAggregatedTaxes.forEach((result) => {
          handlePostClaim(batch, result, value.transaction_hash);
        });
      });
  }
}

export async function claimSingleLand(
  land: LandWithActions,
  { client: sdk }: ReturnType<typeof useDojo>,
  account: Account | AccountInterface,
) {
  const result = await getAggregatedTaxes(land);

  await sdk.client.actions
    .claim(account, land.location as BigNumberish)
    .then((value) => {
      handlePostClaim([land], result, value.transaction_hash);
    });
}

async function handlePostClaim(
  lands: LandWithActions[],
  result: ClaimResult,
  transactionHash: string,
) {
  if (transactionHash) {
    notificationQueue.addNotification(transactionHash, 'claim');
  }

  // Update claim states for all lands
  lands.forEach((land) => {
    claimStore.value[land.location].animating = true;
    claimStore.value[land.location].claimable = false;
  });

  // Handle nukables
  result.nukables.forEach((land) => {
    if (land.nukable) {
      nukeStore.animationManager.triggerAnimation(land.location);
      claimStore.value[land.location].land.type = 'auction';
    }
  });

  // Animation timeout
  setTimeout(() => {
    lands.forEach((land) => {
      claimStore.value[land.location].animating = false;
    });
  }, 2000);

  // Claimable timeout
  setTimeout(() => {
    lands.forEach((land) => {
      if (land.type === 'house') {
        claimStore.value[land.location].claimable = true;
      }
    });
  }, 30 * 1000);

  // Update claim queue
  claimQueue.addAll(
    result.taxes.map((tax) => {
      const token = getTokenInfo(tax.tokenAddress);
      tax.totalTax.setToken(token);
      return tax.totalTax;
    }),
  );
}
