<script lang="ts">
  import type { LandWithActions } from '$lib/api/land.svelte';
  import LandInfoModal from './land-info-modal.svelte';
  import { landStore, createLandWithActions } from '../../../routes/next/store.svelte';
  import { parseLocation } from '$lib/utils';
  import { onMount, onDestroy } from 'svelte';
  import { BuildingLand } from '$lib/api/land/building_land';

  let { data } = $props<{ data: { location?: string } }>();
  let land: LandWithActions | null = $state(null);
  let unsubscribe: (() => void) | null = $state(null);

  onMount(() => {
    if (!data?.location) return;

    try {
      const [x, y] = parseLocation(data.location);
      const landReadable = landStore.getLand(x, y);
      
      if (landReadable) {
        unsubscribe = landReadable.subscribe((value) => {
          if (value && value instanceof BuildingLand) {
            land = createLandWithActions(value);
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

<div class="land-info-widget">
  {#if land}
    <LandInfoModal {land} />
  {/if}
</div>

<style>
  .land-info-widget {
    min-width: 300px;
    min-height: 200px;
  }
</style>
