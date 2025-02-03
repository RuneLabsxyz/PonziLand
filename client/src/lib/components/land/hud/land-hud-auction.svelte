<script lang="ts">
  import { getAuctionDataFromLocation } from '$lib/api/auction.svelte';
  import type { LandSetup } from '$lib/api/land.svelte';
  import { useLands } from '$lib/api/land.svelte';
  import type { Auction } from '$lib/models.gen';
  import { selectedLand, selectedLandMeta } from '$lib/stores/stores.svelte';
  import { toHexWithPadding } from '$lib/utils';
  import Button from '../../ui/button/button.svelte';
  import BuySellForm from '../../buy/buy-sell-form.svelte';
  import type { Token } from '$lib/interfaces';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import BigNumber from 'bignumber.js';
  import LandOverview from '../land-overview.svelte';

  let extended = $state(false);
  let loading = $state(false);

  let auctionInfo = $state<Auction>();
  let currentPrice = $state<CurrencyAmount>();
  let priceDisplay = $derived(currentPrice?.toString());

  $effect(() => {
    fetchCurrentPrice();

    const interval = setInterval(() => {
      console.log('Fetching current price');
      fetchCurrentPrice();
    }, 2000);

    return () => clearInterval(interval);
  });

  const fetchCurrentPrice = () => {
    if (!$selectedLand) {
      return;
    }

    $selectedLandMeta
      ?.getCurrentAuctionPrice()
      .then((res) => (currentPrice = res));
  };
</script>

<div class="flex gap-4 relative items-center border-ponzi-auction -m-2 p-6">
  {#if $selectedLandMeta}
    <LandOverview land={$selectedLandMeta} />
  {/if}
  <div class="w-full text-shadow-none flex flex-col leading-none text-lg">
    <div class="flex justify-between text-yellow-500">
      <p class="opacity-50">Owner:</p>
      <p>Under Auction</p>
    </div>
    <div class="flex justify-between text-yellow-500">
      <p class="opacity-50">Current Price</p>
      <p class="text-right">
        {priceDisplay}
        {$selectedLandMeta?.token?.symbol}
      </p>
    </div>
  </div>
</div>

<style>
  .border-ponzi-auction {
    background-image: url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' stroke='%23F2B545FF' stroke-width='10' stroke-dasharray='20%2c20' stroke-dashoffset='0' stroke-linecap='butt'/%3e%3c/svg%3e");
  }
</style>
