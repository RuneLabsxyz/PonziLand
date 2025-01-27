<script lang="ts">
  import { usePlayerPlands } from '$lib/stores/stores.svelte';
  import { parseLocation } from '$lib/utils';
  import LandInfoCard from '../land/land-info-card.svelte';
  import { ScrollArea } from '../ui/scroll-area';

  let playerLandsStore = usePlayerPlands();
</script>

<ScrollArea class="h-full w-full relative">
  <div class="flex flex-col">
    {#each $playerLandsStore as land}
      <LandInfoCard {land} />
    {/each}
  </div>
</ScrollArea>
