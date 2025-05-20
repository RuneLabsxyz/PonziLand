import type { BaseLand, LandSetup } from '$lib/api/land';
import type { LandWithActions } from '$lib/api/land';
import { BuildingLand } from '$lib/api/land/building_land';
import { LandTileStore } from '$lib/api/land_tiles.svelte';
import { toHexWithPadding } from '$lib/utils';
import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
import { get } from 'svelte/store';

import { AuctionLand } from '$lib/api/land/auction_land';
import { Neighbors } from '$lib/api/neighbors';
import { GAME_SPEED, LEVEL_UP_TIME } from '$lib/const';
import { useDojo } from '$lib/contexts/dojo';
import type { LandYieldInfo } from '$lib/interfaces';
import { notificationQueue } from '$lib/stores/event.store.svelte';
import { type Level } from '$lib/utils/level';
import { estimateNukeTime } from '$lib/utils/taxes';

export let landStore = $state(new LandTileStore());

export let selectedLand = $state<{ value: BaseLand | null }>({ value: null });

export const selectedLandWithActions = () => {
  return selectedLandWithActionsState;
};

export const createLandWithActions = (land: BuildingLand | AuctionLand) => {
  const { client: sdk, accountManager } = useDojo();
  const account = () => {
    return accountManager!.getProvider();
  };

  const landWithActions = {
    ...land,
    stakeAmount: land.stakeAmount,
    lastPayTime: land.lastPayTime?.getTime() ?? 0 / 1000,
    sellPrice: land.sellPrice,
    type: (land.type === 'empty'
      ? 'grass'
      : land.type === 'building'
        ? 'house'
        : land.type) as 'grass' | 'house' | 'auction',
    level: land.level,
    owner: land.owner,
    block_date_bought: land.block_date_bought,
    sell_price: land.sell_price,
    token_used: land.token_used,
    tokenUsed: land.token_used,
    tokenAddress: land.token?.address ?? null,
    token: land.token,
    location: land.locationString,

    async wait() {},

    // Add functions
    async increaseStake(amount: CurrencyAmount) {
      let res = await sdk.client.actions.increaseStake(
        account()?.getWalletAccount()!,
        land.locationString,
        land.token.address,
        amount.toBignumberish(),
      );
      notificationQueue.addNotification(
        res?.transaction_hash ?? null,
        'increase stake',
      );
      return res;
    },
    async increasePrice(amount: CurrencyAmount) {
      let res = await sdk.client.actions.increasePrice(
        account()?.getWalletAccount()!,
        land.locationString,
        amount.toBignumberish(),
      );
      notificationQueue.addNotification(
        res?.transaction_hash ?? null,
        'increase price',
      );
      return res;
    },
    async claim() {
      let res = await sdk.client.actions.claim(
        account()?.getAccount()!,
        land.locationString,
      );
      notificationQueue.addNotification(res?.transaction_hash ?? null, 'claim');
      return res;
    },
    async getPendingTaxes() {
      const result = (await sdk.client.actions.getPendingTaxesForLand(
        land.locationString,
        account()!.getWalletAccount()!.address,
      )) as any[] | undefined;

      return result?.map((tax) => ({
        amount: CurrencyAmount.fromUnscaled(tax.amount),
        tokenAddress: toHexWithPadding(tax.token_address),
      }));
    },
    async getNextClaim() {
      const result = (await sdk.client.actions.getNextClaimInfo(
        land.locationString,
      )) as any[] | undefined;
      return result?.map((claim) => ({
        amount: CurrencyAmount.fromUnscaled(claim.amount),
        tokenAddress: toHexWithPadding(claim.token_address),
        landLocation: toHexWithPadding(claim.land_location),
        canBeNuked: claim.can_be_nuked,
      }));
    },
    async getNukable() {
      const result = (await sdk.client.actions.getTimeToNuke(
        land.locationString,
      )) as unknown as number | undefined;
      return result;
    },
    async getCurrentAuctionPrice() {
      return CurrencyAmount.fromUnscaled(
        (await sdk.client.actions.getCurrentAuctionPrice(
          land.locationString,
        ))! as string,
      );
    },
    async getYieldInfo() {
      const result = (await sdk.client.actions.getNeighborsYield(
        land.locationString,
      )) as LandYieldInfo | undefined;

      return result;
    },
    async levelUp() {
      return await sdk.client.actions.levelUp(
        account()?.getAccount()!,
        land.locationString,
      );
    },
    getEstimatedNukeTime() {
      return estimateNukeTime(
        landWithActions,
        this.getNeighbors().getNeighbors().length,
      );
    },
    getNeighbors() {
      return new Neighbors({
        location: land.locationString,
        source: get(landStore.getAllLands()),
      });
    },
    getLevelInfo() {
      const now = Math.floor(Date.now() / 1000);
      const boughtSince = (now - Number(land.boughtAt)) * GAME_SPEED;

      const expectedLevel = Math.min(
        Math.floor(boughtSince / LEVEL_UP_TIME) + 1,
        3,
      ) as Level;
      const timeSinceLastLevelUp = boughtSince % LEVEL_UP_TIME;
      const levelUpTime = expectedLevel < 3 ? LEVEL_UP_TIME : 0;

      return {
        canLevelUp: expectedLevel > land.level,
        expectedLevel,
        timeSinceLastLevelUp,
        levelUpTime,
      };
    },
  };

  return landWithActions;
};

let selectedLandWithActionsState = $derived.by(() => {
  if (!selectedLand.value) {
    return { value: null };
  }

  const land = selectedLand.value;

  if (!BuildingLand.is(land) && !AuctionLand.is(land)) {
    return null;
  }

  const landWithActions: LandWithActions = createLandWithActions(land);

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
