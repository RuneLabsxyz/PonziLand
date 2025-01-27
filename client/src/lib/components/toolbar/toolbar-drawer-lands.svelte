<script lang="ts">
  import { useLands, type LandWithActions } from '$lib/api/land.svelte';

  import { moveCameraTo } from '$lib/stores/camera';
  import { selectLand, usePlayerPlands } from '$lib/stores/stores.svelte';
  import { ensureNumber, parseLocation } from '$lib/utils';
  import LandOverview from '../land/land-overview.svelte';
  import { ScrollArea } from '../ui/scroll-area';
  import LandYieldInfo from './land-yield-info.svelte';
  import LandTimeUntilNuke from './land-yield-info.svelte';

  let playerLandsStore = usePlayerPlands();
</script>

<ScrollArea class="h-full w-full relative">
  <div class="flex flex-col">
    {#each $playerLandsStore as land}
      {@const location = parseLocation(land.location)}
      <button
        class="p-3 text-left flex gap-4 text-ponzi land-card"
        onclick={() => {
          moveCameraTo(location[0], location[1]);
          selectLand(land);
        }}
      >
        <LandOverview {land} />
        <div class="w-full text-shadow-none flex flex-col leading-none">
          <!-- <p>
            Bought at: {new Date(
              parseInt(land.block_date_bought as string, 16) * 1000,
            ).toLocaleString()}
          </p> -->

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
              {land.token?.name}/h
            </p>
          </div>
          <div class="flex justify-between">
            <p class="opacity-50">Stake Remaining</p>
            <p>
              {land.stakeAmount}
            </p>
          </div>
          <LandYieldInfo {land} />
        </div>
      </button>
    {/each}
  </div>
</ScrollArea>

<style>
  .land-card:nth-child(odd) {
    background-color: #252536;
  }

  .land-card:nth-child(even) {
    background-color: #1b1b2a;
  }
</style>
