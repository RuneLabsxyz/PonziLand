<script lang="ts">
  import type { LandWithActions } from '$lib/api/land';
  import { AuctionLand } from '$lib/api/land/auction_land';
  import { BuildingLand } from '$lib/api/land/building_land';
  import { landStore } from '$lib/stores/store.svelte';
  import { parseLocation } from '$lib/utils';
  import { createLandWithActions } from '$lib/utils/land-actions';
  import { onDestroy } from 'svelte';
  import LandInfos from './land-infos.svelte';
  import {
    tutorialState,
    tutorialLandStore,
  } from '$lib/components/tutorial/stores.svelte';

  let { data } = $props<{ data: { location?: string } }>();
  let land: LandWithActions | null = $state(null);
  let unsubscribe: (() => void) | null = null;

  $effect(() => {
    // Clean up previous subscription
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }

    if (!data?.location) {
      land = null;
      return;
    }

    try {
      const [x, y] = parseLocation(data.location);
      const store = tutorialState.tutorialEnabled
        ? tutorialLandStore
        : landStore;
      const landReadable = store.getLand(x, y);

      if (landReadable) {
        unsubscribe = landReadable.subscribe((value) => {
          if (value && (BuildingLand.is(value) || AuctionLand.is(value))) {
            land = createLandWithActions(value, () => store.getAllLands());
          } else {
            land = null;
          }
        });
      }
    } catch (error) {
      console.error('Failed to load land data:', error);
    }
  });

  onDestroy(() => {
    if (unsubscribe) {
      unsubscribe();
    }
  });
</script>

{#if land}
  <LandInfos {land} />
{/if}
