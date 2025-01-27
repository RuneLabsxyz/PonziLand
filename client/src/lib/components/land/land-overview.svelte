<script lang="ts">
  import type { LandWithActions } from '$lib/api/land.svelte';
  import type { Token } from '$lib/interfaces';
  import type { Land } from '$lib/models.gen';
  import { selectedLand, selectedLandMeta } from '$lib/stores/stores.svelte';
  import { locationIntToString, toHexWithPadding } from '$lib/utils';

  const { land }: { land: LandWithActions } = $props();
</script>

<div class="flex flex-col">
  <div
    class="flex items-center justify-center h-24 w-24 bg-[#85C771] rounded border border-white relative"
  >
    {#if land.type == 'auction'}
      <img alt="auction" src={`/tiles/${land.type}.png`} />
    {:else if land.type == 'grass'}
      <img alt="grass" src={`/tiles/${land.type}.png`} />
    {:else}
      <img
        alt="house"
        src={land.token?.images.castle.basic}
        class="h-20 w-20"
      />
    {/if}
    <div class="absolute top-0 left-0 -mt-1 leading-none">
      <span class="text-ponzi">{locationIntToString(land.location)}</span>
    </div>
  </div>
</div>
