<script lang="ts">
  import type { LandWithActions } from '$lib/api/land.svelte';
  import { moveCameraTo } from '$lib/stores/camera';
  import { selectedLandMeta, selectLand } from '$lib/stores/stores.svelte';
  import { parseLocation } from '$lib/utils';
  import ThreeDots from '$lib/components/ui/loading/three-dots.svelte';
  import LandOverview from './land-overview.svelte';

  let { land }: { land: LandWithActions } = $props();

  let location = parseLocation(land.location);

  let expanded = $state(false);

  const handleExpander = () => {
    expanded = !expanded;
  };
</script>

<div
  class="p-3 text-left text-stroke-0 text-ponzi relative flex gap-4 items-start even:bg-[#1b1b2a] odd:bg-[#252536] {land.location ==
  $selectedLandMeta?.location
    ? 'border border-yellow-400'
    : ''}"
>
  {#if land.type == 'house'}
    <button
      class="absolute top-0 right-0 m-2"
      onclick={handleExpander}
      aria-label="Expand"
    >
      <div class="expander {expanded ? 'expanded' : ''}"></div>
    </button>
  {/if}
  <button
    onclick={() => {
      moveCameraTo(location[0] + 1, location[1] + 1);
      selectLand(land);
    }}
  >
    <LandOverview {land} />
  </button>

  <div class="w-full flex flex-col">
    {#if land.tokenUsed}
      <div class="flex justify-between">
        <p class="opacity-50">Token</p>
        <p>
          {land.token?.name}
        </p>
      </div>
    {/if}
    <div class="flex justify-between">
      <p class="opacity-50">Start price</p>
      <p class="break-all">
        {land.sellPrice}
      </p>
    </div>

    <div class="flex justify-between">
      <p class="opacity-50">Current</p>
      {#await land.getCurrentAuctionPrice()}
        <p class="break-all">
          loading price <ThreeDots />
        </p>
      {:then currentprice}
        <p class="break-all text-ponzi-number text-[#f2b545]">
          {#if currentprice?.rawValue().toNumber() == 0}
            free
          {:else}
            {currentprice?.rawValue().toNumber().toLocaleString()}
          {/if}
        </p>
      {/await}
    </div>
  </div>
</div>

<style>
  .expander {
    opacity: 0.5;
    border: solid white;
    border-width: 0 3px 3px 0;
    padding: 3px;
    transform: rotate(45deg);
    transition: all 0.3s ease-out;
  }

  .expander.expanded {
    transform: rotate(-135deg);
  }
</style>
