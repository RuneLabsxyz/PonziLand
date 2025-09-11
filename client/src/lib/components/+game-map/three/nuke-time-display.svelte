<script lang="ts">
  import { BuildingLand } from '$lib/api/land/building_land';
  import { landStore } from '$lib/stores/store.svelte';
  import { padAddress } from '$lib/utils';
  import { createLandWithActions } from '$lib/utils/land-actions';
  import { estimateNukeTime, parseNukeTime } from '$lib/utils/taxes';
  import { T } from '@threlte/core';
  import { onDestroy } from 'svelte';
  import { SvelteMap } from 'svelte/reactivity';
  import {
    MeshBasicMaterial,
    NearestFilter,
    PlaneGeometry,
    TextureLoader,
  } from 'three';
  import type { LandTile } from './landTile';
  import { TextTextureCache } from './utils/text-texture';

  interface Props {
    landTiles: LandTile[];
    isShieldMode?: boolean;
    isUnzoomed?: boolean;
    currentUserAddress?: string;
  }

  let {
    landTiles,
    isShieldMode = false,
    isUnzoomed = false,
    currentUserAddress,
  }: Props = $props();

  const textureCache = new TextTextureCache();
  const textureLoader = new TextureLoader();

  // Shield textures based on nuke time thresholds
  const shieldTextures = {
    blue: textureLoader.load('/ui/icons/Icon_ShieldBlue.png'),
    grey: textureLoader.load('/ui/icons/Icon_ShieldGrey.png'),
    yellow: textureLoader.load('/ui/icons/Icon_ShieldYellow.png'),
    orange: textureLoader.load('/ui/icons/Icon_ShieldOrange.png'),
    red: textureLoader.load('/ui/icons/Icon_ShieldRed.png'),
    nuke: textureLoader.load('/extra/nuke.png'),
  };

  // Configure shield textures
  Object.values(shieldTextures).forEach((texture) => {
    texture.magFilter = NearestFilter;
    texture.minFilter = NearestFilter;
    texture.colorSpace = 'srgb';
  });

  // Determine shield type based on days remaining (same logic as land-nuke-shield.svelte)
  function getShieldType(days: number): keyof typeof shieldTextures {
    if (days >= 7) return 'blue';
    if (days >= 5) return 'grey';
    if (days >= 3) return 'yellow';
    if (days >= 2) return 'orange';
    return 'red';
  }

  // Check if the current user owns the land tile
  function isOwnedByCurrentUser(tile: LandTile): boolean {
    if (!currentUserAddress || !BuildingLand.is(tile.land)) return false;
    return padAddress(tile.land.owner) === padAddress(currentUserAddress);
  }

  // Determine if nuke time should be displayed for this tile
  function shouldShowNukeTime(tile: LandTile): boolean {
    // Always show when zoomed in
    if (!isUnzoomed) return true;

    // When unzoomed, only show for lands owned by current user
    return isOwnedByCurrentUser(tile);
  }

  // Format nuke time for display
  function formatNukeTime(timeInSeconds: number): {
    text: string;
    shieldType: keyof typeof shieldTextures;
  } {
    const parsedTime = parseNukeTime(timeInSeconds);

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

    const shieldType = getShieldType(parsedTime.days);
    return { text: displayText, shieldType };
  }

  // Cache for nuke time calculations
  let nukeTimeCache = $state(
    new SvelteMap<string, { timeInSeconds: number; lastCalculated: number }>(),
  );

  // Filtered land tiles that should show nuke times
  let visibleNukeTiles = $derived(
    landTiles.filter((tile) => {
      if (!BuildingLand.is(tile.land)) return false;
      if (!shouldShowNukeTime(tile)) return false;

      // Check if it has neighbors
      try {
        const landWithActions = createLandWithActions(
          tile.land,
          landStore.getAllLands,
        );
        return landWithActions.getNeighbors()?.getBaseLandsArray()?.length > 0;
      } catch {
        return false;
      }
    }),
  );

  // Reactive nuke time data calculation with cached async calculations
  let nukeTimeData = $derived.by(() => {
    const dataMap = new SvelteMap<
      string,
      {
        text: string;
        position: [number, number, number];
        shieldType: keyof typeof shieldTextures;
        timeInSeconds?: number;
      }
    >();

    for (const tile of visibleNukeTiles) {
      try {
        const locationKey = tile.land.locationString;
        const cachedResult = nukeTimeCache.get(locationKey);

        // Use cached result if available and recent (within 30 seconds)
        const now = Date.now();
        const useCache =
          cachedResult && now - cachedResult.lastCalculated < 30000;

        if (useCache) {
          const { text, shieldType } = formatNukeTime(
            cachedResult.timeInSeconds,
          );
          dataMap.set(locationKey, {
            text,
            position: [
              tile.position[0],
              tile.position[1] + 0.1,
              tile.position[2],
            ],
            shieldType,
            timeInSeconds: cachedResult.timeInSeconds,
          });
        } else {
          // Trigger async calculation and use placeholder for now
          calculateNukeTimeAsync(tile);

          // Use fallback display while calculating
          dataMap.set(locationKey, {
            text: '...',
            position: [
              tile.position[0],
              tile.position[1] + 0.1,
              tile.position[2],
            ],
            shieldType: 'grey',
          });
        }
      } catch (error) {
        console.warn(
          'Failed to process nuke time for tile:',
          tile.land.locationString,
          error,
        );
        dataMap.set(tile.land.locationString, {
          text: '?',
          position: [
            tile.position[0],
            tile.position[1] + 0.1,
            tile.position[2],
          ],
          shieldType: 'grey',
        });
      }
    }

    return dataMap;
  });

  // Async function to calculate nuke times and update cache
  async function calculateNukeTimeAsync(tile: LandTile) {
    if (!BuildingLand.is(tile.land)) return;

    try {
      const landWithActions = createLandWithActions(
        tile.land,
        landStore.getAllLands,
      );
      const timeInSeconds = await estimateNukeTime(landWithActions);

      // Update cache with new result
      nukeTimeCache.set(tile.land.locationString, {
        timeInSeconds,
        lastCalculated: Date.now(),
      });

      // Trigger reactivity update
      nukeTimeCache = new SvelteMap(nukeTimeCache);
    } catch (error) {
      console.warn(
        'Failed to calculate nuke time for tile:',
        tile.land.locationString,
        error,
      );
    }
  }

  const textGeometry = new PlaneGeometry(0.4, 0.2);
  const shieldGeometry = new PlaneGeometry(0.3, 0.3); // Slightly larger for shield background

  onDestroy(() => {
    textureCache.clear();
    textGeometry.dispose();
    shieldGeometry.dispose();
    Object.values(shieldTextures).forEach((texture) => texture.dispose());
  });
</script>

<!-- Render shield backgrounds and text for each nuke time -->
{#each Array.from(nukeTimeData.entries()) as [, data]}
  {@const shieldTexture = shieldTextures[data.shieldType]}
  {@const shieldMaterial = new MeshBasicMaterial({
    map: shieldTexture,
    transparent: true,
    alphaTest: 0.1,
  })}

  {@const shieldOffset = isShieldMode ? [-0.2, 0, 0] : [0.4, 0, -0.4]};
  {@const textPosition: [number, number, number] = [
    data.position[0] + shieldOffset[0], // Offset slightly for shield mode
    data.position[1], // Elevated above the tile
    data.position[2] + shieldOffset[2]  // Offset toward the top (negative Z is forward/top)
  ]}
  {@const shieldPosition: [number, number, number] = [
    textPosition[0], // Offset slightly for shield mode
    textPosition[1] - 0.01, // Slightly behind the text
    textPosition[2] - .02
  ]}

  {@const textTexture = textureCache.get(data.text, {
    fontSize: 20,
    color: data.shieldType === 'nuke' ? '#ff0000' : '#ffffff',
    width: 128,
    height: 64,
  })}
  {@const textMaterial = new MeshBasicMaterial({
    map: textTexture,
    transparent: true,
    alphaTest: 0.1,
  })}

  <!-- Shield background -->
  <T.Mesh
    position={shieldPosition}
    rotation={[-Math.PI / 2, 0, 0]}
    geometry={shieldGeometry}
    material={shieldMaterial}
    scale={isShieldMode ? 1.5 : 1}
  />

  <!-- Text overlay -->
  <T.Mesh
    position={textPosition}
    rotation={[-Math.PI / 2, 0, 0]}
    geometry={textGeometry}
    material={textMaterial}
    scale={isShieldMode ? 1.5 : 1}
  />
{/each}
