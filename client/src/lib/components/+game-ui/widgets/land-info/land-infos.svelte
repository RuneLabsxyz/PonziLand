<script lang="ts">
  import account from '$lib/account.svelte';
  import type { LandWithActions } from '$lib/api/land';
  import LandNukeTime from '$lib/components/+game-map/land/land-nuke-time.svelte';
  import LandOverview from '$lib/components/+game-map/land/land-overview.svelte';
  import LandOwnerInfo from '$lib/components/+game-map/land/land-owner-info.svelte';
  import { Button } from '$lib/components/ui/button';
  import Card from '$lib/components/ui/card/card.svelte';
  import PriceDisplay from '$lib/components/ui/price-display.svelte';
  import TokenAvatar from '$lib/components/ui/token-avatar/token-avatar.svelte';
  import { padAddress } from '$lib/utils';
  import InfoTabs from './info-tabs.svelte';

  let { land }: { land: LandWithActions } = $props();

  let showSwapButton = $state(false);
  let onSwapClick = $state<(() => void) | null>(null);
  let swapTokenSymbol = $state<string | null>(null);

  let address = $derived(account.address);
  let isOwner = $derived(land?.owner === padAddress(address ?? ''));

  let currentPrice = $state(land.sellPrice);
  let fetching = $state(false);

  $effect(() => {
    if (land.type == 'auction') {
      fetchCurrentPrice();

      const interval = setInterval(() => {
        if (land.type == 'auction') {
          fetchCurrentPrice();
        } else {
          currentPrice == land.sellPrice;
        }
      }, 5000);

      return () => clearInterval(interval);
    } else {
      currentPrice = land.sellPrice;
      fetching = false;
    }
  });

  const fetchCurrentPrice = () => {
    if (!land) {
      return;
    }

    fetching = true;

    land?.getCurrentAuctionPrice().then((res) => {
      if (res) {
        currentPrice = res;
      }
      fetching = false;
    });
  };
</script>

{#if land.type !== 'auction'}
  <div class="absolute left-0 top-0 -translate-y-full">
    <LandOwnerInfo {land} {isOwner} />
  </div>
  <div class="absolute top-0 right-0 -translate-y-full">
    <Card>
      <LandNukeTime {land} />
    </Card>
  </div>
{/if}
<div class="h-full w-full flex flex-col">
  <div class="w-full flex">
    <div class="flex flex-col items-center px-8 pt-8">
      <LandOverview {land} {isOwner} size="lg" />
      <div
        class="mt-6 text-ponzi-number text-2xl flex items-center gap-2 stroke-3d-black"
      >
        {land.token?.symbol}
        <TokenAvatar token={land.token} class="w-7 h-7" />
      </div>
      <div class="flex flex-col text-2xl gap-1 mt-5">
        <PriceDisplay price={currentPrice} token={land.token} showRate />
      </div>
      {#if fetching}
        Fetching auction price...
      {/if}
      {#if showSwapButton && onSwapClick}
        <Button variant="red" size="lg" onclick={onSwapClick} class="mt-4">
          SWAP TO {swapTokenSymbol ?? ''}
        </Button>
      {/if}
    </div>
    <InfoTabs
      {land}
      auctionPrice={currentPrice}
      bind:showSwapButton
      bind:onSwapClick
      bind:swapTokenSymbol
    />
  </div>
</div>
