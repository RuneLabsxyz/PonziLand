<script lang="ts">
  import { useLands, type LandWithActions } from '$lib/api/land.svelte';
  import { landStore } from '$lib/api/mock-land';
  import addressState from '$lib/account.svelte';

  import { useDojo } from '$lib/contexts/dojo';
  import { moveCameraTo } from '$lib/stores/camera';
  import {
    ensureNumber,
    padAddress,
    shortenHex,
    toBigInt,
    toHexWithPadding,
  } from '$lib/utils';
  import { ScrollArea } from '../ui/scroll-area';
  import data from '$lib/data.json';
  import LandOverview from '../land/land-overview.svelte';
  import { selectedLand, selectLand } from '$lib/stores/stores.svelte';

  let landsStore = useLands();

  const address = $derived(addressState.address);

  function convertCoordinates(land: LandWithActions) {
    const location = ensureNumber(land.location);
    return {
      x: (location % 64) + 1,
      y: Math.floor(location / 64) + 1,
    };
  }

  let playerLands = $derived(() => {
    if (!$landsStore) return [];
    if (!address) return [];

    const playerLands = $landsStore.filter(
      (land) => land.owner == padAddress(address ?? ''),
    );

    return playerLands.sort(
      (a, b) => ensureNumber(a.location) - ensureNumber(b.location),
    );
  });
</script>

<ScrollArea class="h-full w-full relative">
  <div class="flex flex-col">
    {#each playerLands() as land}
      <button
        class="p-3 text-left flex gap-2 text-ponzi"
        onclick={() => {
          moveCameraTo(
            Math.floor(ensureNumber(land.location) % 64) + 1,
            Math.floor(ensureNumber(land.location) / 64) + 1,
          );
          selectLand(land);
        }}
      >
        <LandOverview data={land} />
        <div>
          <p class="font-medium">
            Location: {convertCoordinates(land)}
          </p>
          <p>Block date bought: {land.block_date_bought}</p>
          <p>Sell Price: {land.sell_price}</p>
          {#if land.token_used}
            <p>Token: {shortenHex(land.token_used)}</p>
          {/if}
          {#if land.pool_key}
            <p>Pool: {land.pool_key}</p>
          {/if}
        </div>
      </button>
    {/each}
  </div>
</ScrollArea>
