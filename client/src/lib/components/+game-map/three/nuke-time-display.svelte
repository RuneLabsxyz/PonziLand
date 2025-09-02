<script lang="ts">
  import { T } from '@threlte/core';
  import { onDestroy } from 'svelte';
  import {
    MeshBasicMaterial,
    NearestFilter,
    PlaneGeometry,
    TextureLoader,
  } from 'three';
  import type { LandTile } from './landTile';
  import { TextTextureCache } from './utils/text-texture';
  import { estimateNukeTime, parseNukeTime } from '$lib/utils/taxes';
  import { BuildingLand } from '$lib/api/land/buildingLand';
  import { createLandWithActions } from '$lib/utils/land-actions';
  import { landStore } from '$lib/stores/store.svelte';

  interface Props {
    landTiles: LandTile[];
    isShieldMode?: boolean;
  }

  let { landTiles, isShieldMode = false }: Props = $props();

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

  let nukeTimeData = $state<
    Map<
      string,
      {
        text: string;
        position: [number, number, number];
        shieldType: keyof typeof shieldTextures;
      }
    >
  >(new Map());

  // Determine shield type based on days remaining (same logic as land-nuke-shield.svelte)
  function getShieldType(days: number): keyof typeof shieldTextures {
    if (days >= 7) return 'blue';
    if (days >= 5) return 'grey';
    if (days >= 3) return 'yellow';
    if (days >= 2) return 'orange';
    return 'red';
  }

  // Calculate nuke times for all lands
  $effect(() => {
    const calculateNukeTimes = async () => {
      if (!landTiles || landTiles.length === 0) return;

      const newNukeTimeData = new Map<
        string,
        {
          text: string;
          position: [number, number, number];
          shieldType: keyof typeof shieldTextures;
        }
      >();

      for (const tile of landTiles) {
        // Only process building lands with neighbors
        if (!BuildingLand.is(tile.land)) {
          continue;
        }

        try {
          // Convert BaseLand to LandWithActions
          const landWithActions = createLandWithActions(
            tile.land,
            landStore.getAllLands,
          );

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

          // Determine shield type based on days remaining
          const shieldType = getShieldType(parsedTime.days);

          newNukeTimeData.set(tile.land.locationString, {
            text: displayText,
            position: [
              tile.position[0],
              tile.position[1] + 0.1, // Elevated above the tile
              tile.position[2], // Offset toward the top (negative Z is forward/top)
            ],
            shieldType,
          });
        } catch (error) {
          console.warn(
            'Failed to calculate nuke time for tile:',
            tile.land.locationString,
            error,
          );
          newNukeTimeData.set(tile.land.locationString, {
            text: '?',
            position: [
              tile.position[0],
              tile.position[1] + 0.1,
              tile.position[2], // Offset toward the top (negative Z is forward/top)
            ],
            shieldType: 'grey', // Default to grey shield for errors
          });
        }
      }

      nukeTimeData = newNukeTimeData;
    };

    calculateNukeTimes();
  });

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
