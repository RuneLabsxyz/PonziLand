<script lang="ts">
  import {
    selectedLandMeta,
    type SelectedLandType,
  } from '$lib/stores/stores.svelte';

  let { land } = $props<{ land: SelectedLandType }>();

  $effect(() => {
    let firstLandId = land.location - 1;
    let secondLandId = land.location + 1;
  });
</script>

<div
  class="absolute inset-0 grid grid-cols-3 grid-rows-3"
  style="transform: translate(-33.33%, -33.33%); width: 300%; height: 300%;"
>
  {#each Array(9) as _, i}
    <div class="border-2 border-blue-400/50 bg-blue-400/10"></div>
  {/each}
</div>
