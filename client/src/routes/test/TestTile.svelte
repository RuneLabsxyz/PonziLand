<script lang="ts">
  import type { BaseLand } from '$lib/api/land';
  import { onMount } from 'svelte';
  import type { Readable } from 'svelte/store';

  const { land: landStore }: { land: Readable<BaseLand> } = $props();

  let land = $derived($landStore);

  let loaded = false;
  let changing = $state(false);

  onMount(() => {
    return landStore.subscribe((value) => {
      if (!loaded) {
        loaded = true;
        return;
      }
      console.log('land changed');
      changing = true;
      const timeoutId = setTimeout(() => (changing = false), 100);
      return () => clearTimeout(timeoutId);
    });
  });
</script>

<div
  class={{ land: true, [`land-${land.type}`]: true, 'land-changing': changing }}
></div>

<style>
  .land {
    aspect-ratio: 1;
    height: 15px;
    transition: background-color 20s ease-out;
  }

  .land-empty {
    background-color: #4a8f3f;
  }

  .land-auction {
    background-color: #f27030;
  }

  .land-building {
    background-color: #6f748c;
  }

  .land-changing {
    background-color: #ffff00 !important; /* dark yellow */
    transition: none;
  }
</style>
