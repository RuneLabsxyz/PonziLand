import type { BaseLand, LandSetup, LandWithActions } from '$lib/api/land';
import { BuildingLand } from '$lib/api/land/building_land';
import { LandTileStore } from '$lib/api/land_tiles.svelte';
import { createLandWithActions } from '$lib/utils/land-actions';

import { AuctionLand } from '$lib/api/land/auction_land';
import { Neighbors } from '$lib/api/neighbors';
import { useDojo } from '$lib/contexts/dojo';
import { parseDojoCall } from '@dojoengine/core';
import { getManifest } from '$lib/manifest';
import type { Call } from 'starknet';

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

export async function buyLand(
  location: string,
  setup: LandSetup,
  swapCalls: Call[] = [],
) {
  try {
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
      swapCalls,
    );
    return res;
  } catch (error) {
    console.error('Dojo not initialized yet:', error);
    throw new Error(
      'Game client not ready. Please wait for initialization to complete.',
    );
  }
}

export async function bidLand(
  location: string,
  setup: LandSetup,
  swapCalls: Call[] = [],
) {
  try {
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
      swapCalls,
    );
    return res;
  } catch (error) {
    console.error('Dojo not initialized yet:', error);
    throw new Error(
      'Game client not ready. Please wait for initialization to complete.',
    );
  }
}

export function getNeighboringLands(location: string): BaseLand[] {
  const allLands = landStore.getAllLands();
  const landsArray = Array.isArray(allLands) ? allLands : [];
  const neighbors = new Neighbors({
    location,
    source: landsArray,
  });
  return neighbors.getBaseLandsArray();
}
