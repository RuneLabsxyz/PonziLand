<script lang="ts">
  import { selectedLandMeta } from '$lib/stores/stores.svelte';
  import type { YieldInfo } from '$lib/interfaces';

  let yieldInfo: YieldInfo[] | undefined;

  async function updateYieldInfo() {
    yieldInfo = await $selectedLandMeta?.getYieldInfo();
  }

  $effect(() => {
    if ($selectedLandMeta) {
      updateYieldInfo();
    }
  });

  $effect(() => {
    console.log(yieldInfo);
  });
</script>

<div
  class="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none"
  style="transform: translate(-33.33%, -33.33%); width: 300%; height: 300%;"
>
  {#each Array(9) as _, i}
    <div class="border-2 border-blue-400/50 bg-blue-400/10"></div>
  {/each}
</div>
