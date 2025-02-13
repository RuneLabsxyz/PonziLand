<script lang="ts">
  import type { LandWithActions } from '$lib/api/land.svelte';
  import { locationIntToString } from '$lib/utils';
  import LandDisplay from './land-display.svelte';

  const { land, size = 'sm' }: { land: LandWithActions; size?: 'sm' | 'lg' } =
    $props();

  const OFF_IMAGE = '/assets/ui/star/off.png';
  const ON_IMAGE = '/assets/ui/star/on.png';
</script>

<div class="flex flex-col">
  <div
    class="flex items-center justify-center relative
    {size == 'lg' ? 'h-48 w-48' : 'h-24 w-24'}"
  >
    {#if land.type == 'auction'}
      <LandDisplay auction class="scale-125" />
    {:else if land.type == 'grass'}
      <LandDisplay
        grass
        seed={locationIntToString(land.location)}
        class="scale-125"
      />
    {:else if land.type == 'house'}
      <LandDisplay token={land.token} class="scale-125" />
    {/if}
    <div class="absolute top-0 left-0 -mt-1 leading-none">
      <span class="text-ponzi {size == 'lg' ? 'text-xl' : 'text-lg'}"
        >{locationIntToString(land.location)}</span
      >
    </div>

    <div
      class="absolute -bottom-3 left-0 w-full leading-none flex flex-row justify-center"
    >
      <img
        src={land.level >= 0 ? ON_IMAGE : OFF_IMAGE}
        class="w-5"
        alt="no star"
      />

      <img
        src={land.level >= 1 ? ON_IMAGE : OFF_IMAGE}
        class="w-5"
        alt="no star"
      />

      <img
        src={land.level >= 2 ? ON_IMAGE : OFF_IMAGE}
        class="w-5"
        alt="no star"
      />
    </div>
  </div>
</div>
