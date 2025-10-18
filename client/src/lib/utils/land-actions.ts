import type { BaseLand } from '$lib/api/land';
import { AuctionLand } from '$lib/api/land/auction_land';
import { BuildingLand } from '$lib/api/land/building_land';
import { Neighbors } from '$lib/api/neighbors';
import { configValues } from '$lib/stores/config.store.svelte';
import { useDojo } from '$lib/contexts/dojo';
import type { ElapsedTimeSinceLastClaim, LandYieldInfo } from '$lib/interfaces';
import { notificationQueue } from '$lib/stores/event.store.svelte';
import { landStore } from '$lib/stores/store.svelte';
import { toHexWithPadding } from '$lib/utils';
import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
import type { Level } from '$lib/utils/level';
import { estimateNukeTime } from '$lib/utils/taxes';
import type { Readable } from 'svelte/store';
import {
  calculateAuctionPrice,
  calculateYieldInfo,
} from './clientCalculations';

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
    neighborsInfo: land.neighborsInfo,
    neighborsInfoPacked: land.neighborsInfoPacked,
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
    quest_id: land.quest_id,

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
    async getCurrentAuctionPrice(useRpcForExactPrice: boolean = false) {
      // Try client-side calculation first (fast, for display/UI)
      if (!useRpcForExactPrice) {
        try {
          // Only use client calculation for auction lands
          if (land.type === 'auction' && AuctionLand.is(land)) {
            // Calculate current price using client-side logic with individual parameters
            const startTimeSeconds = land.startTime.getTime();
            const calculatedPrice = calculateAuctionPrice(
              startTimeSeconds,
              land.startPrice.toBigint(),
              land.floorPrice.toBigint(),
            );

            // Return as CurrencyAmount
            return CurrencyAmount.fromUnscaled(
              calculatedPrice.toString(),
              land.token,
            );
          }
        } catch (error) {
          console.warn(
            'Client-side auction price calculation failed, falling back to RPC:',
            error,
          );
        }
      }
      console.log('🔗 Using RPC for exact auction price (for bidding)');
      const rpcPrice = (await sdk.client.actions.getCurrentAuctionPrice(
        land.locationString,
      ))! as string;
      return CurrencyAmount.fromUnscaled(rpcPrice, land.token);
    },

    async getYieldInfo(useRpcForExactCalculation: boolean = false) {
      // Try client-side calculation first (fast, for display/UI)
      if (!useRpcForExactCalculation) {
        try {
          // Get neighbors using the existing land method
          const neighbors = land.getNeighbors(landStore);
          const neighborLands = neighbors.getBaseLandsArray();

          const calculatedYieldInfo = calculateYieldInfo(neighborLands);

          if (calculatedYieldInfo) {
            console.log('Using client-side yield calculation (fast)');
            return calculatedYieldInfo;
          }
        } catch (error) {
          console.warn(
            'Client-side yield calculation failed, falling back to RPC:',
            error,
          );
        }
      }

      // If useRpcForExactCalculation is true, always use RPC for exact data
      console.log('Using RPC for exact yield info (for precise calculations)');
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
    async getElapsedTimeSinceLastClaimForNeighbors() {
      const res =
        (await sdk.client.actions.getElapsedTimeSinceLastClaimForNeighbors(
          land.locationString,
        )) as ElapsedTimeSinceLastClaim[] | undefined;
      return res;
    },
    async getEstimatedNukeTime() {
      return await estimateNukeTime(
        this,
        land.getNeighbors(landStore).getBaseLandsArray().length,
      );
    },
    getNeighbors() {
      return land.getNeighbors(landStore);
    },
    getLevelInfo() {
      const gameSpeed = configValues.gameSpeed;
      const levelUpTime = configValues.levelUpTime;
      const now = Math.floor(Date.now() / 1000);
      const boughtSince = (now - Number(land.boughtAt)) * gameSpeed;

      const expectedLevel = Math.min(
        Math.floor(boughtSince / levelUpTime) + 1,
        3,
      ) as Level;
      const timeSinceLastLevelUp = boughtSince % levelUpTime;
      const levelUpTimeLeft = expectedLevel < 3 ? levelUpTime : 0;

      return {
        canLevelUp: expectedLevel > land.level,
        expectedLevel,
        timeSinceLastLevelUp,
        levelUpTime: levelUpTime,
      };
    },
  };

  return landWithActions;
};
