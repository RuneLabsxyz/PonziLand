import type { BaseLand, LandSetup, LandWithActions } from '$lib/api/land';
import { BuildingLand } from '$lib/api/land/buildingLand';
import { LandTileStore } from '$lib/api/landTiles.svelte';
import { createLandWithActions } from '$lib/utils/land-actions';

import { AuctionLand } from '$lib/api/land/auctionLand';
import { Neighbors } from '$lib/api/neighbors';
import { useDojo } from '$lib/contexts/dojo';
import { notificationQueue } from '$lib/stores/event.store.svelte';

// Main stores following Dojo subscription pattern
export let landStore = $state(new LandTileStore());
export let selectedLand = $state<{ value: BaseLand | null }>({ value: null });

export let highlightedLands = $state<{ value: string[] }>({ value: [] });

export const selectedLandWithActions = () => {
  return selectedLandWithActionsState;
};

let selectedLandWithActionsState = $derived.by(() => {
  if (!selectedLand.value) {
    return { value: null };
  }

  const land = selectedLand.value;

  if (!BuildingLand.is(land) && !AuctionLand.is(land)) {
    return null;
  }

  const landWithActions: LandWithActions = createLandWithActions(land, () =>
    landStore.getAllLands(),
  );

  return { value: landWithActions };
});

export async function buyLand(location: string, setup: LandSetup) {
  const { client: sdk, accountManager } = useDojo();
  const account = () => {
    return accountManager!.getProvider();
  };

  let res = await sdk.client.actions.buy(
    account()?.getWalletAccount()!,
    location,
    setup.tokenForSaleAddress,
    setup.salePrice.toBignumberish(),
    setup.amountToStake.toBignumberish(),
    setup.tokenAddress,
    setup.currentPrice!.toBignumberish(),
  );
  notificationQueue.addNotification(res?.transaction_hash ?? null, 'buy land');
  return res;
}

export async function bidLand(location: string, setup: LandSetup) {
  const { client: sdk, accountManager } = useDojo();
  const account = () => {
    return accountManager!.getProvider();
  };

  console.log('bidLand', location, setup);
  console.log('account', account()?.getWalletAccount()?.address);

  let res = await sdk.client.actions.bid(
    account()?.getWalletAccount()!,
    location,
    setup.tokenForSaleAddress,
    setup.salePrice.toBignumberish(),
    setup.amountToStake.toBignumberish(),
    setup.tokenAddress,
    setup.currentPrice!.toBignumberish(),
  );
  notificationQueue.addNotification(res?.transaction_hash ?? null, 'buy land');
  return res;
}

export function getNeighboringLands(location: string): BaseLand[] {
  const allLands = landStore.getAllLands();
  const landsArray = Array.isArray(allLands) ? allLands : [];
  const neighbors = new Neighbors({
    location,
    source: landsArray,
  });
  return neighbors.getNeighbors();
}
