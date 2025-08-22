import type { BaseLand, LandSetup, LandWithActions } from '$lib/api/land';
import { BuildingLand } from '$lib/api/land/buildingLand';
import { LandTileStore } from '$lib/api/landTiles.svelte';
import { createLandWithActions } from '$lib/utils/land-actions';

import { AuctionLand } from '$lib/api/land/auctionLand';
import { useDojo } from '$lib/contexts/dojo';
import { notificationQueue } from '$lib/stores/event.svelte';

// Main stores following Dojo subscription pattern
export const landStore = $state(new LandTileStore());
export const selectedLand = $state<{ value: BaseLand | null }>({ value: null });

export const highlightedLands = $state<{ value: string[] }>({ value: [] });

export const selectedLandWithActions = () => {
  return selectedLandWithActionsState;
};

const selectedLandWithActionsState = $derived.by(() => {
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

// TODO(Red): bidLand function should be inside of the BuildingLand type, instead of being a standalone function.
// Having functions everywhere makes it harder to understand the codebase, and makes it harder to maintain.
export async function buyLand(location: string, setup: LandSetup) {
  const { client: sdk, accountManager } = useDojo();
  const account = () => {
    return accountManager!.getProvider();
  };

  const res = await sdk.client.actions.buy(
    account()!.getWalletAccount()!,
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

// TODO(Red): bidLand function should be inside of the AuctionLand type, instead of being a standalone function.
// Having functions everywhere makes it harder to understand the codebase, and makes it harder to maintain.
export async function bidLand(location: string, setup: LandSetup) {
  const { client: sdk, accountManager } = useDojo();
  const account = () => {
    return accountManager!.getProvider();
  };

  console.log('bidLand', location, setup);
  console.log('account', account()?.getWalletAccount()?.address);

  const res = await sdk.client.actions.bid(
    account()!.getWalletAccount()!,
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
