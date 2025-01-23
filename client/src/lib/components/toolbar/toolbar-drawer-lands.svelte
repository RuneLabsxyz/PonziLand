<script lang="ts">
  import { useLands, type LandWithActions } from '$lib/api/land.svelte';
  import { landStore } from '$lib/api/mock-land';
  import addressState from '$lib/account.svelte';

  import { useDojo } from '$lib/contexts/dojo';
  import { moveCameraTo } from '$lib/stores/camera';
  import {
    ensureNumber,
    padAddress,
    parseLocation,
    shortenHex,
    toBigInt,
    toHexWithPadding,
  } from '$lib/utils';
  import { ScrollArea } from '../ui/scroll-area';
  import data from '$lib/data.json';
  import LandOverview from '../land/land-overview.svelte';
  import {
    selectedLand,
    selectLand,
    usePlayerPlands,
  } from '$lib/stores/stores.svelte';

  let landsStore = useLands();
  let playerLandsStore = usePlayerPlands();

  function convertCoordinates(land: LandWithActions) {
    const location = ensureNumber(land.location);
    return {
      x: (location % 64) + 1,
      y: Math.floor(location / 64) + 1,
    };
  }
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
        <LandOverview data={land} />
        <div
          class="w-full text-shadow-none gap-1 flex flex-col text-lg leading-none"
        >
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
            <p class="opacity-50">Stake Remaining:</p>
            <p>
              {land.stakeAmount}
            </p>
          </div>
          <div class="flex justify-between">
            <p class="opacity-50">Daily maintenance cost:</p>
            <p>
              {land.sellPrice.rawValue().multipliedBy(0.02).toString()}
              {land.token?.name}/h
            </p>
          </div>
          <div class="flex justify-between">
            <p class="opacity-50">Sell price:</p>
            <p>
              {land.sellPrice}
            </p>
          </div>
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
