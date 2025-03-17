<script lang="ts">
  import { usePlayerLands } from '$lib/stores/stores.svelte';
  import { uiStore } from '$lib/stores/ui.store.svelte';
  import LandInfoCard from '../land/land-info-card.svelte';
  import { ScrollArea } from '../ui/scroll-area';

  let playerLandsStore = usePlayerLands();
</script>

<div class="text-lg font-semibold">My Lands</div>
<ScrollArea class="h-full w-full relative">
  <div class="flex flex-col items-center">
    {#each $playerLandsStore as land}
      <LandInfoCard {land} />
    {/each}
    {#if $playerLandsStore.length === 0}
      <div class="text-center text-sm text-gray-400">
        You don't own any lands yet
      </div>
      <button
        class="text-sm text-yellow-500 hover:opacity-90 hover:cursor-pointer"
        onclick={() => {
          uiStore.toolbarActive = 'auctions';
        }}
      >
        See ongoing auctions
      </button>
    {/if}
  </div>
</ScrollArea>
