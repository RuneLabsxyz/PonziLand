<script lang="ts">
  import type { LandWithActions } from '$lib/api/land.svelte';
  import { locationIntToString } from '$lib/utils';

  const { land, size = 'sm' }: { land: LandWithActions; size?: 'sm' | 'lg' } =
    $props();
</script>

<div class="flex flex-col">
  <div
    class="flex items-center justify-center bg-[#85C771] rounded border border-white relative
    {size == 'lg' ? 'h-48 w-48' : 'h-24 w-24'}"
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
      <span class="text-ponzi {size == 'lg' ? 'text-xl' : ''}"
        >{locationIntToString(land.location)}</span
      >
    </div>
  </div>
</div>
