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
        class="p-3 text-left flex gap-2 text-ponzi"
        onclick={() => {
          moveCameraTo(location[0], location[1]);
          selectLand(land);
        }}
      >
        <LandOverview data={land} />
        <div>
          <p class="font-medium">
            Location: {location[0]}, {location[1]}
          </p>
          <p>
            Bought at: {new Date(
              parseInt(land.block_date_bought as string, 16) * 1000,
            ).toLocaleString()}
          </p>
          <p>Sell Price: {land.sellPrice}</p>

          {#if land.tokenUsed}
            <p>Token: {land.token?.name}</p>
          {/if}
        </div>
      </button>
    {/each}
  </div>
</ScrollArea>
