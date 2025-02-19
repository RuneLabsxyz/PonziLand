<script lang="ts">
  import { usePlayerLands } from '$lib/stores/stores.svelte';
  import LandInfoCard from '../land/land-info-card.svelte';
  import { ScrollArea } from '../ui/scroll-area';

  let playerLandsStore = usePlayerLands();
</script>

<div class="text-lg font-semibold">My Lands</div>
<ScrollArea class="h-full w-full relative">
  <div class="flex flex-col">
    {#each $playerLandsStore as land}
      <LandInfoCard {land} />
    {/each}
  </div>
</ScrollArea>
