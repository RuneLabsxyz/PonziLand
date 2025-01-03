<script lang="ts">
    import { tileHUD } from "$lib/stores/stores";
    import { getAuctionData } from "$lib/api/mock-land";
    import type { AuctionData } from "$lib/interfaces";
    import { handleTileBuy, handleAuctionBuy } from "$lib/stores/ui.svelte";
    import * as Popover from "$lib/components/ui/popover";

    let auctionInfo = $state<AuctionData | null>(null);

    $effect(() => {
        if ($tileHUD && !$tileHUD?.owner) {
            const auctionData = getAuctionData($tileHUD!.location);
            if (auctionData) {
                auctionInfo = auctionData;
            }
        }
    });
</script>

<!-- Tile HUD with close button -->
{#if $tileHUD}
    <div class="p-2 text-white bg-[#323350] shadow-lg z-40">
        <Popover.Close>
            <button
                class="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                onclick={() => ($tileHUD = null)}
            >
                ✕
            </button>
        </Popover.Close>
        <!-- <button
            class="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            onclick={() => ($tileHUD = null)}
        >
            ✕
        </button> -->
        <h1 class="text-lg font-bold mb-2">Tile HUD</h1>
        <div class="space-y-2">
            <p>
                Location: ({Math.floor($tileHUD.location % 64) + 1}, {Math.floor(
                    $tileHUD.location / 64,
                ) + 1})
            </p>
            <p>Owner: {$tileHUD.owner ?? "Unclaimed"}</p>
        </div>
        {#if $tileHUD.owner}
            <button
                class="mt-4 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
                onclick={() =>
                    handleTileBuy({
                        location: $tileHUD!.location,
                        sellPrice: $tileHUD!.sellPrice,
                        tokenUsed: `${$tileHUD!.tokenUsed}`,
                        tokenAddress: $tileHUD!.tokenAddress ?? "",
                        owner: $tileHUD!.owner ?? undefined,
                    })}
            >
                Buy for {$tileHUD.sellPrice}
                {$tileHUD.tokenUsed}
            </button>
        {:else}
            <button
                class="mt-4 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
                onclick={() => {
                    if (auctionInfo) {
                        handleAuctionBuy(auctionInfo);
                    }
                }}
            >
                Bid
            </button>
        {/if}
    </div>
{/if}
