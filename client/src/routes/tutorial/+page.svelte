<script lang="ts">
  import LoadingScreen from '$lib/components/loading-screen/loading-screen.svelte';
  import TutorialMap from '$lib/components/tutorial/map.svelte';
  import { tutorialLandStore } from '$lib/components/tutorial/stores.svelte';
  import TutorialUi from '$lib/components/tutorial/ui.svelte';
  import { GRID_SIZE } from '$lib/const';
  import { setupClient } from '$lib/contexts/client.svelte';
  import { dojoConfig } from '$lib/dojoConfig';

  let loading = $state(true);
  let value = $state(10);

  const promise = new Promise<void>((resolve) => {
    setupClient(dojoConfig);
    // Use setTimeout to ensure the setup is complete and any state updates are processed
    setTimeout(() => {
      // Set initial camera position to center of map
      const centerX = Math.floor(GRID_SIZE / 2);
      const centerY = Math.floor(GRID_SIZE / 2);
      const location = centerX + centerY * GRID_SIZE;
      tutorialLandStore.moveCameraToLocation(location, 3);
      resolve();
    }, 100);
  });

  $effect(() => {
    let increment = 10;
    const interval = setInterval(() => {
      value += increment;
      if (increment > 1) {
        increment = increment - 1;
      }
      if (value >= 80) {
        clearInterval(interval);
      }
    }, 100);

    function clearLoading() {
      clearInterval(interval);
      value = 100;
      setTimeout(() => {
        loading = false;
      }, 200);
    }

    promise
      .then(() => {
        console.log('Tutorial setup complete!');
        clearLoading();
      })
      .catch((err) => {
        console.error('An error occurred during tutorial setup:', err);
        // TODO: Handle error state appropriately
      });
  });
</script>

<div class="h-screen w-screen bg-black/10 overflow-visible">
  {#if loading}
    <LoadingScreen {value} />
  {:else}
    <TutorialMap />
    <TutorialUi />
  {/if}
</div>
