<script lang="ts">
  import { LandTileStore } from '$lib/api/land_tiles.svelte';
  import Stats from '$lib/components/debug/Stats.svelte';
  import Map from '$lib/components/map/map.svelte';
  import Swap from '$lib/components/swap/swap.svelte';
  import Ui from '$lib/components/ui.svelte';
  import { GRID_SIZE } from '$lib/const';

  import { setupAccount } from '$lib/contexts/account.svelte';
  import { setupClient } from '$lib/contexts/client.svelte';
  import { setupStore } from '$lib/contexts/store.svelte';
  import { dojoConfig } from '$lib/dojoConfig';
  import Grid from './Grid.svelte';
  import TestTile from './TestTile.svelte';

  const store = new LandTileStore();

  const promise = Promise.all([
    setupClient(dojoConfig).then((client) => store.setup(client!)),
    setupAccount(),
    setupStore(),
    // Setup the lands
  ]);
</script>

<!-- <Stats /> -->

{#await promise}
  Loading...
{:then _}
  <div class="flex flex-col">
    <div class="bg-white">
      <Grid {store} />
    </div>

    <Map />

    <!-- {#each Array(GRID_SIZE) as _, y}
      <div class="flex flex-row">
        {#each Array(GRID_SIZE) as _, x}
          {@const land = store.getLand(x, y)!}
          <TestTile {land} />
        {/each}
      </div>
    {/each} -->
  </div>
{:catch error}
  {@debug error}
  Error: {error.message}
{/await}
