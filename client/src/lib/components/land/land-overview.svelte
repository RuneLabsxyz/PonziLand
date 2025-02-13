<script lang="ts">
  import type { LandWithActions } from '$lib/api/land.svelte';
  import { locationIntToString } from '$lib/utils';
  import LandDisplay from './land-display.svelte';

  const { land, size = 'sm' }: { land: LandWithActions; size?: 'sm' | 'lg' } =
    $props();
</script>

<div class="flex flex-col">
  <div
    class="flex items-center justify-center relative
    {size == 'lg' ? 'h-48 w-48' : 'h-24 w-24'}"
  >
    {#if land.type == 'auction'}
      <LandDisplay auction />
    {:else if land.type == 'grass'}
      <LandDisplay />
    {:else}
      <LandDisplay basic />
    {/if}
    <div class="absolute top-0 left-0 -mt-1 leading-none">
      <span class="text-ponzi {size == 'lg' ? 'text-xl' : 'text-lg'}"
        >{locationIntToString(land.location)}</span
      >
    </div>
  </div>
</div>
