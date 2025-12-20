<script lang="ts">
  import type { LandWithActions } from '$lib/api/land';
  import TokenAvatar from '$lib/components/ui/token-avatar/token-avatar.svelte';
  import {
    fetchHistoricalPositions,
    type HistoricalPosition,
  } from '$lib/components/+game-ui/widgets/positions/historical-positions.service';
  import account from '$lib/account.svelte';
  import { padAddress } from '$lib/utils';
  import { displayCurrency } from '$lib/utils/currency';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { untrack } from 'svelte';

  interface Props {
    lands: LandWithActions[];
  }

  let { lands }: Props = $props();

  interface GameStatsData {
    landsOwned: number;
    totalPurchases: number;
    biggestBuy: {
      usdValue: number;
      tokenAmount: CurrencyAmount | null;
      token: any;
    } | null;
    totalEarnings: number;
    isLoading: boolean;
  }

  let gameStats = $state<GameStatsData>({
    landsOwned: 0,
    totalPurchases: 0,
    biggestBuy: null,
    totalEarnings: 0,
    isLoading: true,
  });

  let lastFetchedAddress = $state('');

  $effect(() => {
    const currentAddress = account.address;
    const currentLandsCount = lands.length;

    // Update lands owned immediately
    gameStats = { ...untrack(() => gameStats), landsOwned: currentLandsCount };

    if (!currentAddress) {
      gameStats = {
        landsOwned: currentLandsCount,
        totalPurchases: 0,
        biggestBuy: null,
        totalEarnings: 0,
        isLoading: false,
      };
      lastFetchedAddress = '';
      return;
    }

    const userAddress = padAddress(currentAddress);
    if (!userAddress) {
      gameStats = {
        landsOwned: currentLandsCount,
        totalPurchases: 0,
        biggestBuy: null,
        totalEarnings: 0,
        isLoading: false,
      };
      return;
    }

    // Skip if already fetched for this address
    if (userAddress === untrack(() => lastFetchedAddress)) {
      return;
    }

    lastFetchedAddress = userAddress;
    gameStats = { ...untrack(() => gameStats), isLoading: true };

    fetchHistoricalPositions(userAddress)
      .then((positions) => {
        if (!positions.length) {
          gameStats = {
            landsOwned: currentLandsCount,
            totalPurchases: 0,
            biggestBuy: null,
            totalEarnings: 0,
            isLoading: false,
          };
          return;
        }

        // Total purchases = all positions (including open ones)
        const totalPurchases = positions.length;

        // Find biggest buy by USD equivalent
        let biggestBuy: GameStatsData['biggestBuy'] = null;
        let maxBuyUsd = 0;

        for (const position of positions) {
          const buyCostUsd = position.metrics?.buyCostBaseEquivalent;
          if (buyCostUsd) {
            const usdValue = Number(buyCostUsd.rawValue());
            if (usdValue > maxBuyUsd) {
              maxBuyUsd = usdValue;
              biggestBuy = {
                usdValue,
                tokenAmount: position.metrics?.buyAmount || null,
                token: position.metrics?.buyToken,
              };
            }
          }
        }

        // Calculate total earnings (sum of all inflows)
        let totalEarnings = 0;
        for (const position of positions) {
          const inflow = position.metrics?.totalInflowBaseEquivalent;
          if (inflow) {
            totalEarnings += Number(inflow.rawValue());
          }
        }

        gameStats = {
          landsOwned: currentLandsCount,
          totalPurchases,
          biggestBuy,
          totalEarnings,
          isLoading: false,
        };
      })
      .catch((error) => {
        console.error('Error fetching game stats:', error);
        gameStats = {
          landsOwned: currentLandsCount,
          totalPurchases: 0,
          biggestBuy: null,
          totalEarnings: 0,
          isLoading: false,
        };
      });
  });
</script>

<div class="flex flex-col gap-3">
  <div class="text-sm font-semibold opacity-70 flex items-center gap-2">
    <img src="/ui/icons/IconTiny_Stats.png" alt="Stats" class="h-4 w-4" />
    Game Stats
  </div>

  {#if gameStats.isLoading}
    <div class="text-center text-sm opacity-50">Loading...</div>
  {:else}
    <div class="bg-black/20 rounded-lg p-3 flex flex-col gap-2 font-ponzi-number text-sm">
      <!-- Lands Owned -->
      <div class="flex justify-between items-center">
        <span class="opacity-50">Lands Owned</span>
        <span>{gameStats.landsOwned}</span>
      </div>

      <!-- Total Purchases -->
      <div class="flex justify-between items-center">
        <span class="opacity-50">Total Purchases</span>
        <span>{gameStats.totalPurchases}</span>
      </div>

      <!-- Biggest Buy -->
      <div class="flex justify-between items-center">
        <span class="opacity-50">Biggest Buy</span>
        {#if gameStats.biggestBuy}
          <div class="flex items-center gap-1">
            <span>{displayCurrency(gameStats.biggestBuy.usdValue)} $</span>
            {#if gameStats.biggestBuy.tokenAmount && gameStats.biggestBuy.token}
              <span class="opacity-50 flex items-center gap-1">
                ({gameStats.biggestBuy.tokenAmount.toString()}
                <TokenAvatar
                  token={gameStats.biggestBuy.token}
                  class="h-3 w-3"
                />)
              </span>
            {/if}
          </div>
        {:else}
          <span class="opacity-50">-</span>
        {/if}
      </div>

      <!-- Total Earnings -->
      <div class="flex justify-between items-center">
        <span class="opacity-50">Total Earnings</span>
        <span class="text-green-500">
          +{displayCurrency(gameStats.totalEarnings)} $
        </span>
      </div>
    </div>
  {/if}
</div>
