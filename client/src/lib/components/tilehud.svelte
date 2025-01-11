<script lang="ts">
  // import { tileHUD } from '$lib/stores/stores';
  // import { mousePosCoords } from '$lib/stores/stores';
  // import { getAuctionData } from '$lib/api/mock-land';
  // import type { AuctionData } from '$lib/interfaces';
  // import { useLands } from '$lib/api/land.svelte';
  // import Card from './ui/card/card.svelte';
  // import AuctionHud from './auction/auction-hud.svelte';
  // import { shortenHex, toHexWithPadding } from '$lib/utils';

  // let landStore = useLands();

  // // Receive the onBuyTile callback prop from the parent
  // let { onBuyTile, onBidTile } = $props();
</script>

<!-- Tile HUD with close button -->
<!-- {#if $tileHUD}
  <Card class="fixed bottom-0 right-0 z-50 w-80">
    <button
      class="absolute top-0 right-0 text-white hover:text-gray-400"
      onclick={() => ($tileHUD = null)}
    >
      ✕
    </button>
    <div>
      <p>
        Location: ({Math.floor($tileHUD.location % 64) + 1}, {Math.floor(
          $tileHUD.location / 64,
        ) + 1})
        #{$tileHUD.location}
      </p>
      <p>Owner: {shortenHex($tileHUD.owner ?? '') || 'Unclaimed'}</p>
    </div>
    {#if $tileHUD.owner != toHexWithPadding(0) && $tileHUD.owner != null}
      <button
        class="mt-4 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
        onclick={() =>
          onBuyTile({
            location: $tileHUD!.location,
            sellPrice: $tileHUD!.sellPrice,
            tokenUsed: $tileHUD!.tokenUsed,
            tokenAddress: $tileHUD!.tokenAddress,
            owner: $tileHUD!.owner,
          })}
      >
        Buy for {$tileHUD.sellPrice}
        {$tileHUD.tokenUsed}
      </button>
    {:else}
      <AuctionHud />
    {/if}
  </Card>
{/if} -->
