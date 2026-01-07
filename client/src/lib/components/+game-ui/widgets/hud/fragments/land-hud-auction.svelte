<script lang="ts">
  import type { LandWithActions } from '$lib/api/land';
  import { openLandInfoWidget } from '$lib/components/+game-ui/game-ui.svelte';
  import { Button } from '$lib/components/ui/button';
  import PriceDisplay from '$lib/components/ui/price-display.svelte';
  import TokenAvatar from '$lib/components/ui/token-avatar/token-avatar.svelte';
  import { settingsStore } from '$lib/stores/settings.store.svelte';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import data from '$profileData';
  import LandOverview from '$lib/components/+game-map/land/land-overview.svelte';
  import {
    nextStep,
    tutorialAttribute,
    tutorialState,
  } from '$lib/components/tutorial/stores.svelte';

  let { land }: { land: LandWithActions } = $props();

  let displayToken = $derived.by(() => {
    const targetAddress = data.mainCurrencyAddress;
    return data.availableTokens.find(
      (token) => token.address === targetAddress,
    );
  });

  let currentPrice = $state<CurrencyAmount>();
  let priceDisplay = $derived(currentPrice?.toString());

  $effect(() => {
    // In tutorial mode, use a mock price to avoid RPC hangs
    if (tutorialState.tutorialEnabled) {
      currentPrice = CurrencyAmount.fromScaled(0.5, displayToken);
      return;
    }

    fetchCurrentPrice();

    const interval = setInterval(() => {
      console.log('Fetching current price');
      fetchCurrentPrice();
    }, 10_000);

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
      <div class="flex gap-2">
        <PriceDisplay price={currentPrice} showRate />
        {#if !currentPrice.isZero()}
          <div
            class="text-ponzi-number text-xl flex items-center gap-2 stroke-3d-black mb-4"
          >
            {displayToken?.symbol}
            <TokenAvatar token={displayToken} class="w-5 h-5" />
          </div>
        {/if}
      </div>
    {:else}
      <div class="text-ponzi-number text-center">Loading...</div>
    {/if}
    <Button
      class={tutorialAttribute('highlight_map_buy').has
        ? 'tutorial-highlight-button'
        : ''}
      onclick={() => {
        if (tutorialAttribute('wait_buy_land_open').has) {
          nextStep();
        }
        openLandInfoWidget(land);
      }}>BUY LAND</Button
    >
  </div>
</div>

<style>
  .border-ponzi-auction {
    background-image: url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' stroke='%23F2B545FF' stroke-width='10' stroke-dasharray='20%2c20' stroke-dashoffset='0' stroke-linecap='butt'/%3e%3c/svg%3e");
  }

  :global(.tutorial-highlight-button) {
    border: 2px solid #ffd700 !important;
    animation: goldGlow 2s ease-in-out infinite;
  }

  @keyframes goldGlow {
    0%,
    100% {
      box-shadow:
        0 0 8px rgba(255, 215, 0, 0.4),
        0 0 16px rgba(255, 215, 0, 0.2);
    }
    50% {
      box-shadow:
        0 0 16px rgba(255, 215, 0, 0.8),
        0 0 32px rgba(255, 215, 0, 0.4);
    }
  }
</style>
