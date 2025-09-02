<script lang="ts">
  import account from '$lib/account.svelte';
  import type { LandWithActions } from '$lib/api/land';
  import LandNukeTime from '$lib/components/+game-map/land/land-nuke-time.svelte';
  import LandOverview from '$lib/components/+game-map/land/land-overview.svelte';
  import LandOwnerInfo from '$lib/components/+game-map/land/land-owner-info.svelte';
  import Card from '$lib/components/ui/card/card.svelte';
  import PriceDisplay from '$lib/components/ui/price-display.svelte';
  import TokenAvatar from '$lib/components/ui/token-avatar/token-avatar.svelte';
  import { padAddress } from '$lib/utils';
  import InfoTabs from './info-tabs.svelte';
  import { baseToken } from '$lib/stores/tokens.svelte';
  import { tutorialState } from '$lib/components/tutorial/stores.svelte';

  let { land }: { land: LandWithActions } = $props();

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
        {#if land.type == 'auction'}
          {baseToken?.symbol}
          <TokenAvatar token={baseToken} class="w-7 h-7" />
        {:else}
          {land.token?.symbol}
          <TokenAvatar token={land.token} class="w-7 h-7" />
        {/if}
      </div>
      <div
        class="flex text-2xl items-center gap-1 mt-5 {tutorialState.tutorialProgress ==
        5
          ? 'border border-yellow-500 animate-pulse'
          : ''}"
      >
        {#if land.type == 'auction'}
          <PriceDisplay price={currentPrice} token={baseToken} />
        {:else}
          <PriceDisplay price={currentPrice} token={land.token} />
        {/if}
      </div>
      {#if fetching}
        Fetching auction price...
      {/if}
    </div>
    <InfoTabs {land} auctionPrice={currentPrice} />
  </div>
</div>
