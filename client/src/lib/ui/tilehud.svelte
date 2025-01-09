<script lang="ts">
  import { tileHUD } from "$lib/stores/stores";
  import { mousePosCoords } from "$lib/stores/stores";
  import { getAuctionData } from "$lib/api/mock-land";
  import type { AuctionData } from "$lib/interfaces";
  import { useLands } from "$lib/api/land.svelte";
  import { useAccount } from "$lib/contexts/account";
  import { Contract, CallData, cairo } from "starknet";
  import manifest from "$manifest";

  let auctionInfo = $state<AuctionData | null>(null);

  let landStore = useLands();

  $effect(() => {
    if ($tileHUD && !$tileHUD?.owner) {
      const auctionData = getAuctionData($tileHUD!.location);
      if (auctionData) {
        auctionInfo = auctionData;
      }
    }
  });

  // Receive the onBuyTile callback prop from the parent
  let { onBuyTile, onBidTile } = $props();
</script>

<!-- Permanent mouse coordinates display -->
<div class="fixed top-0 right-0 bg-white p-2 rounded shadow-lg z-50">
  <p>
    Mouse: {$mousePosCoords ? `${$mousePosCoords.x}, ${$mousePosCoords.y}` : ""}
  </p>
</div>

<!-- Tile HUD with close button -->
{#if $tileHUD}
  <div class="fixed bottom-0 right-0 bg-white p-4 rounded shadow-lg z-50">
    <button
      class="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
      onclick={() => ($tileHUD = null)}
    >
      ✕
    </button>
    <h1 class="text-lg font-bold mb-2">Tile HUD</h1>
    <div class="space-y-2">
      <p>
        Location: ({Math.floor($tileHUD.location % 64) + 1}, {Math.floor(
          $tileHUD.location / 64
        ) + 1})
      </p>
      <p>Owner: {$tileHUD.owner ?? "Unclaimed"}</p>
    </div>
    {#if $tileHUD.owner}
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
      <button
        class="mt-4 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
        onclick={() => onBidTile(auctionInfo)}
      >
        Bid
      </button>
    {/if}
  </div>
{/if}
