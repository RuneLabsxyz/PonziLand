<script lang="ts">
  import type { LandWithActions } from '$lib/api/land.svelte';
  import type { LandYieldInfo } from '$lib/interfaces';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';

  let { land } = $props<{ land: LandWithActions }>();

  let yieldInfo: LandYieldInfo | undefined;
  let tokenBurnRate: CurrencyAmount = $derived(
    CurrencyAmount.fromRaw(land.sellPrice.rawValue().multipliedBy(0.02)),
  );

  $effect(() => {
    console.log('land from rates', land);
    if (land) {
      land
        .getYieldInfo()
        .then((res: LandYieldInfo | undefined) => {
          yieldInfo = res;
          console.log('yield info response:', res);
        })
        .catch((error: any) => {
          console.error('Error fetching yield info:', error);
        });
    }
  });
</script>

<div
  class="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none"
  style="transform: translate(-33.33%, -33.33%); width: 300%; height: 300%;"
>
  {#each Array(9) as _, i}
    <div class="border border-blue-400 bg-blue-400/40">
      {#if i === 4}
        <span class="whitespace-nowrap text-red-600 text-[6px]">
          -{tokenBurnRate.toString()} {land.token?.name}/h</span
        >
      {/if}
    </div>
  {/each}
</div>
