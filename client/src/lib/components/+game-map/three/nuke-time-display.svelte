<script lang="ts">
  import { T } from '@threlte/core';
  import { onDestroy } from 'svelte';
  import {
    MeshBasicMaterial,
    PlaneGeometry,
  } from 'three';
  import type { LandTile } from './landTile';
  import { TextTextureCache } from './utils/text-texture';
  import { estimateNukeTime, parseNukeTime } from '$lib/utils/taxes';
  import { BuildingLand } from '$lib/api/land/building_land';
  import { createLandWithActions } from '$lib/utils/land-actions';
  import { landStore } from '$lib/stores/store.svelte';

  interface Props {
    landTiles: LandTile[];
  }

  let { landTiles }: Props = $props();

  const textureCache = new TextTextureCache();

  let nukeTimeData = $state<Map<string, { text: string; position: [number, number, number] }>>(new Map());

  // Calculate nuke times for all lands
  $effect(() => {
    const calculateNukeTimes = async () => {
      if (!landTiles || landTiles.length === 0) return;

      const newNukeTimeData = new Map<string, { text: string; position: [number, number, number] }>();

      for (const tile of landTiles) {
        // Only process building lands with neighbors
        if (!BuildingLand.is(tile.land)) {
          continue;
        }

        try {
          // Convert BaseLand to LandWithActions
          const landWithActions = createLandWithActions(tile.land, landStore.getAllLands);
          
          // Check if it has neighbors
          if (landWithActions.getNeighbors()?.getNeighbors()?.length === 0) {
            continue;
          }

          const timeInSeconds = await estimateNukeTime(landWithActions);
          const parsedTime = parseNukeTime(timeInSeconds);
          
          // Format the time for display
          let displayText = '';
          if (parsedTime.days > 0) {
            displayText = `${parsedTime.days}d`;
          } else if (parsedTime.hours > 0) {
            displayText = `${parsedTime.hours}h`;
          } else if (parsedTime.minutes > 0) {
            displayText = `${parsedTime.minutes}m`;
          } else {
            displayText = 'NUKE!';
          }

          newNukeTimeData.set(tile.land.locationString, {
            text: displayText,
            position: [
              tile.position[0],
              tile.position[1] + 0.1, // Elevated above the tile
              tile.position[2]
            ]
          });
        } catch (error) {
          console.warn('Failed to calculate nuke time for tile:', tile.land.locationString, error);
          newNukeTimeData.set(tile.land.locationString, {
            text: '?',
            position: [
              tile.position[0],
              tile.position[1] + 0.1,
              tile.position[2]
            ]
          });
        }
      }

      nukeTimeData = newNukeTimeData;
    };

    calculateNukeTimes();
  });

  const geometry = new PlaneGeometry(0.4, 0.2);

  onDestroy(() => {
    textureCache.clear();
    geometry.dispose();
  });
</script>

<!-- Render individual planes for each nuke time -->
{#each Array.from(nukeTimeData.entries()) as [, data]}
  {@const texture = textureCache.get(data.text, {
    fontSize: 24,
    color: '#ff4444',
    width: 128,
    height: 64,
  })}
  {@const material = new MeshBasicMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.1,
  })}
  
  <T.Mesh
    position={data.position}
    rotation={[-Math.PI / 2, 0, 0]}
    {geometry}
    {material}
  />
{/each}