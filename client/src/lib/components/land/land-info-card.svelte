<script>
  import { landStore } from '$lib/api/mock-land';
  import { moveCameraTo } from '$lib/stores/camera';
  import { selectLand } from '$lib/stores/stores.svelte';
  import { parseLocation } from '$lib/utils';
  import LandYieldInfo from '../toolbar/land-yield-info.svelte';
  import LandOverview from './land-overview.svelte';

  let { land } = $props();

  let location = parseLocation(land.location);

  let expanded = $state(false);

  const handleExpander = () => {
    expanded = !expanded;
  };
</script>

<div
  class="land-card p-3 text-left gap-4 text-ponzi relative flex items-start even:bg-[#1b1b2a] odd:bg-[#252536]"
>
  <button
    class="absolute top-0 right-0 m-2"
    onclick={handleExpander}
    aria-label="Expand"
  >
    <div class="expander {expanded ? 'expanded' : ''}"></div>
  </button>
  <button
    onclick={() => {
      moveCameraTo(location[0], location[1]);
      selectLand(land);
    }}
  >
    <LandOverview {land} />
  </button>
  <div class="w-full text-shadow-none flex flex-col leading-none mt-3">
    {#if land.tokenUsed}
      <div class="flex justify-between">
        <p class="opacity-50">Token</p>
        <p>
          {land.token?.name}
        </p>
      </div>
    {/if}
    <div class="flex justify-between">
      <p class="opacity-50">Sell price</p>
      <p>
        {land.sellPrice}
      </p>
    </div>
    <div class="flex justify-between">
      <p class="opacity-50">Daily maintenance cost</p>
      <p class="text-red-500">
        {land.sellPrice.rawValue().multipliedBy(0.02).toString()}
        {land.token?.symbol}/h
      </p>
    </div>
    <div class="flex justify-between">
      <p class="opacity-50">Stake Remaining</p>
      <p>
        {land.stakeAmount}
      </p>
    </div>
    <LandYieldInfo {land} {expanded} />
  </div>
</div>

<style>
  .expander {
    opacity: 0.5;
    border: solid white;
    border-width: 0 3px 3px 0;
    display: inline-block;
    padding: 3px;
    transform: rotate(45deg);
    transition: all 0.3s ease-out;
  }

  .expander.expanded {
    transform: rotate(-135deg);
  }
</style>
