<script lang="ts">
  import type { LandWithActions } from '$lib/api/land';
  import PriceDisplay from '$lib/components/ui/price-display.svelte';
  import TokenAvatar from '$lib/components/ui/token-avatar/token-avatar.svelte';
  import { baseToken } from '$lib/stores/wallet.svelte';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import LandOverview from '../land-overview.svelte';

  let { land }: { land: LandWithActions } = $props();

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
    if (!land) {
      return;
    }

    land?.getCurrentAuctionPrice().then((res) => (currentPrice = res));
  };
</script>

<div
  class="flex gap-4 relative items-center border-ponzi-auction -mt-8 -m-2 p-6 pt-12"
>
  {#if land}
    <LandOverview {land} />
  {/if}
  <div
    class="w-full flex flex-col leading-none justify-center items-center gap-2"
  >
    <span class="text-yellow-500 text-2xl text-ponzi-number">UNDER AUCTION</span
    >
    {#if currentPrice}
      <PriceDisplay price={currentPrice} />
    {:else}
      <div class="text-ponzi-number text-center">Loading...</div>
    {/if}
    <div
      class="text-ponzi-number text-xl flex items-center gap-2 stroke-3d-black"
    >
      {baseToken?.symbol}
      <TokenAvatar token={baseToken} class="w-5 h-5" />
    </div>
  </div>
</div>

<style>
  .border-ponzi-auction {
    background-image: url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' stroke='%23F2B545FF' stroke-width='10' stroke-dasharray='20%2c20' stroke-dashoffset='0' stroke-linecap='butt'/%3e%3c/svg%3e");
  }
</style>
