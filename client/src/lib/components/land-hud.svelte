<script>
  import { selectedLandMeta } from '$lib/stores/stores.svelte';
  import AuctionHud from './auction/auction-hud.svelte';
  import BuyHud from './buy/buy-hud.svelte';
  import { Card } from './ui/card';
</script>

{#if $selectedLandMeta}
  <Card class="fixed bottom-0 right-0 z-50 w-96 bg-ponzi">
    {#if $selectedLandMeta?.isAuction}
      <AuctionHud />
    {:else}
      <BuyHud />
    {/if}
  </Card>
{/if}
