import type { BaseLand } from '$lib/api/land';
import { AuctionLand } from '$lib/api/land/auction_land';
import { BuildingLand } from '$lib/api/land/building_land';
import { Neighbors } from '$lib/api/neighbors';
import { config } from '$lib/stores/config.store.svelte';
import { useDojo } from '$lib/contexts/dojo';
import type { LandYieldInfo } from '$lib/interfaces';
import { notificationQueue } from '$lib/stores/event.store.svelte';
import { landStore } from '$lib/stores/store.svelte';
import { toHexWithPadding } from '$lib/utils';
import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
import type { Level } from '$lib/utils/level';
import { estimateNukeTime } from '$lib/utils/taxes';
import type { Readable } from 'svelte/store';
import { get } from 'svelte/store';

export const createLandWithActions = (
  land: BuildingLand | AuctionLand,
  getAllLands: () => Readable<BaseLand[]>,
) => {
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
      console.log(sdk.client.actions);
      const result = (await sdk.client.actions.getUnclaimedTaxesPerNeighborTotal(
        land.locationString,
      )) as any[] | undefined;
      console.log(result);

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
      let res = await sdk.client.actions.levelUp(
        account()?.getAccount()!,
        land.locationString,
      );

      notificationQueue.addNotification(
        res?.transaction_hash ?? null,
        'leveling up',
      );
      return res;
    },
    getEstimatedNukeTime() {
      return estimateNukeTime(
        this,
        land.getNeighbors(landStore).getNeighbors().length,
      );
    },
    getNeighbors() {
      return land.getNeighbors(landStore);
    },
    getLevelInfo() {
      const now = Math.floor(Date.now() / 1000);
      const boughtSince = (now - Number(land.boughtAt)) * config.GAME_SPEED;

      const expectedLevel = Math.min(
        Math.floor(boughtSince / config.LEVEL_UP_TIME) + 1,
        3,
      ) as Level;
      const timeSinceLastLevelUp = boughtSince % config.LEVEL_UP_TIME;
      const levelUpTime = expectedLevel < 3 ? config.LEVEL_UP_TIME : 0;

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
