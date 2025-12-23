<script lang="ts">
  import type { LandWithActions } from '$lib/api/land';
  import TokenAvatar from '$lib/components/ui/token-avatar/token-avatar.svelte';
  import { fetchHistoricalPositions } from '$lib/components/+game-ui/widgets/positions/historical-positions.service';
  import account from '$lib/account.svelte';
  import { padAddress } from '$lib/utils';
  import { displayCurrency } from '$lib/utils/currency';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { untrack } from 'svelte';

  interface Props {
    lands: LandWithActions[];
  }

  let { lands }: Props = $props();

  let landsOwned = $derived(lands.length);

  interface FetchedStats {
    totalPurchases: number;
    biggestBuy: {
      usdValue: number;
      tokenAmount: CurrencyAmount | null;
      token: any;
    } | null;
    totalEarnings: number;
  }

  let statsPromise = $state<Promise<FetchedStats> | null>(null);

  let lastFetchedAddress = $state('');
  let lastFetchedLandsKey = $state('');

  $effect(() => {
    const currentAddress = account.address;
    const landsKey = lands.map((l) => l.location).join(',');

    if (!currentAddress) {
      statsPromise = Promise.resolve({
        totalPurchases: 0,
        biggestBuy: null,
        totalEarnings: 0,
      });
      lastFetchedAddress = '';
      lastFetchedLandsKey = '';
      return;
    }

    const userAddress = padAddress(currentAddress);
    if (!userAddress) {
      statsPromise = Promise.resolve({
        totalPurchases: 0,
        biggestBuy: null,
        totalEarnings: 0,
      });
      return;
    }

    const previousAddress = untrack(() => lastFetchedAddress);
    const previousLandsKey = untrack(() => lastFetchedLandsKey);
    if (userAddress === previousAddress && landsKey === previousLandsKey) {
      return;
    }

    lastFetchedAddress = userAddress;
    lastFetchedLandsKey = landsKey;

    statsPromise = fetchHistoricalPositions(userAddress).then((positions) => {
      if (!positions.length) {
        return {
          totalPurchases: 0,
          biggestBuy: null,
          totalEarnings: 0,
        };
      }

      // Total purchases = all positions (including open ones)
      const totalPurchases = positions.length;

      // Find biggest buy by USD equivalent
      let biggestBuy: FetchedStats['biggestBuy'] = null;
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

      return {
        totalPurchases,
        biggestBuy,
        totalEarnings,
      };
    });
  });
</script>

<div class="flex flex-col gap-3">
  <div class="text-sm font-semibold opacity-70 flex items-center gap-2">
    <img src="/ui/icons/IconTiny_Stats.png" alt="Stats" class="h-4 w-4" />
    Game Stats
  </div>

  {#await statsPromise}
    <div class="text-center text-sm opacity-50">Loading...</div>
  {:then stats}
    <div
      class="bg-black/20 rounded-lg p-3 flex flex-col gap-2 font-ponzi-number text-sm"
    >
      <!-- Lands Owned -->
      <div class="flex justify-between items-center">
        <span class="opacity-50">Lands Owned</span>
        <span>{landsOwned}</span>
      </div>

      <!-- Total Purchases -->
      <div class="flex justify-between items-center">
        <span class="opacity-50">Total Purchases</span>
        <span>{stats?.totalPurchases ?? 0}</span>
      </div>

      <!-- Biggest Buy -->
      <div class="flex justify-between items-center">
        <span class="opacity-50">Biggest Buy</span>
        {#if stats?.biggestBuy}
          <div class="flex items-center gap-1">
            <span>{displayCurrency(stats.biggestBuy.usdValue)} $</span>
            {#if stats.biggestBuy.tokenAmount && stats.biggestBuy.token}
              <span class="opacity-50 flex items-center gap-1">
                ({stats.biggestBuy.tokenAmount.toString()}
                <TokenAvatar token={stats.biggestBuy.token} class="h-3 w-3" />)
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
          +{displayCurrency(stats?.totalEarnings ?? 0)} $
        </span>
      </div>
    </div>
  {:catch}
    <div class="text-center text-sm opacity-50">Error loading stats</div>
  {/await}
</div>
