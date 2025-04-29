<script lang="ts">
  import { LandTileStore } from '$lib/api/land_tiles.svelte';
  import Swap from '$lib/components/swap/swap.svelte';
  import { GRID_SIZE } from '$lib/const';

  import { setupAccount } from '$lib/contexts/account.svelte';
  import { setupClient } from '$lib/contexts/client.svelte';
  import { setupStore } from '$lib/contexts/store.svelte';
  import { dojoConfig } from '$lib/dojoConfig';
  import TestTile from './TestTile.svelte';

  const store = new LandTileStore();

  const promise = Promise.all([
    setupClient(dojoConfig).then((client) => store.setup(client!)),
    setupAccount(),
    setupStore(),
    // Setup the lands
  ]);
</script>

{#await promise}
  Loading...
{:then _}
  <div class="flex flex-col">
    {#each Array(GRID_SIZE) as _, y}
      <div class="flex flex-row">
        {#each Array(GRID_SIZE) as _, x}
          {@const land = store.getLand(x, y)!}
          <TestTile {land} />
        {/each}
      </div>
    {/each}
  </div>
{:catch error}
  Error: {error.message}
{/await}

<style>
  .grid-container {
    display: flex;
    flex-wrap: wrap;
    width: calc(64 * 5px);
  }
</style>
