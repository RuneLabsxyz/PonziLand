<script lang="ts">
  import { estimateNukeTime, estimateTax } from '$lib/utils/taxes';
  import LandNukeShield from '../land/land-nuke-shield.svelte';

  let { sellAmountVal, stakeAmountVal } = $props();

  let taxes = $derived(estimateTax(sellAmountVal));

  let rates = $derived.by(() => {
    // return array
    return Array(8)
      .fill(0)
      .map((_, i) => {
        return estimateNukeTime(sellAmountVal, stakeAmountVal, i + 1);
      });
  });
</script>

<div>{sellAmountVal} {stakeAmountVal} : max {taxes.maxRate}/h</div>

<div class="flex justify-between w-full">
  {#each rates as rate, i}
    <div class="flex flex-col items-center w-full">
      <div>{i + 1}</div>
      <LandNukeShield estimatedNukeTime={rate} class="w-10 h-10" />
    </div>
  {/each}
</div>
