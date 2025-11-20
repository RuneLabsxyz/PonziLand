<script lang="ts">
  import { BuildingLand } from '$lib/api/land/building_land';
  import { landStore } from '$lib/stores/store.svelte';
  import { padAddress } from '$lib/utils';
  import { createLandWithActions } from '$lib/utils/land-actions';
  import { T, useTask } from '@threlte/core';
  import { onDestroy } from 'svelte';
  import {
    MeshBasicMaterial,
    NearestFilter,
    PlaneGeometry,
    TextureLoader,
  } from 'three';
  import type { LandTile } from './landTile';
  import { TextTextureCache } from './utils/text-texture';
  import { devsettings } from './utils/devsettings.store.svelte';
  import { nukeTimeManager } from './utils/nuke-time-manager.svelte';

  interface Props {
    landTiles: LandTile[];
    isShieldMode?: boolean;
    isUnzoomed?: boolean;
    currentUserAddress?: string;
    enableAnimation?: boolean;
  }

  let {
    landTiles,
    isShieldMode = false,
    isUnzoomed = false,
    currentUserAddress,
    enableAnimation = true,
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

  // Reactive nuke time data calculation using the manager
  let nukeTimeData = $derived.by(() => {
    return nukeTimeManager.calculateNukeTimeData(visibleNukeTiles, landTiles);
  });

  // Start/stop periodic updates based on visible tiles
  $effect(() => {
    if (visibleNukeTiles.length > 0) {
      nukeTimeManager.startPeriodicUpdates(visibleNukeTiles, landTiles);
    } else {
      nukeTimeManager.stopPeriodicUpdates();
    }

    return () => {
      nukeTimeManager.stopPeriodicUpdates();
    };
  });

  const textGeometry = new PlaneGeometry(0.4, 0.2);
  const shieldGeometry = new PlaneGeometry(0.3, 0.3); // Slightly larger for shield background

  // Pulse animation for nuke state
  let pulseTime = $state(0);
  useTask((delta) => {
    // Only run pulse animation if enabled
    if (enableAnimation) {
      pulseTime += delta;
    }
  });

  // Calculate pulsing opacity for nuke state (oscillates between 0.4 and 1.0)
  const getPulseOpacity = (isNuke: boolean) => {
    if (!isNuke) return 1.0;
    return 0.4 + 0.6 * (Math.sin(pulseTime * 4) * 0.5 + 0.5);
  };

  onDestroy(() => {
    textureCache.clear();
    textGeometry.dispose();
    shieldGeometry.dispose();
    Object.values(shieldTextures).forEach((texture) => texture.dispose());
    nukeTimeManager.stopPeriodicUpdates();
  });
</script>

<!-- Render shield backgrounds and text for each nuke time -->
{#each Array.from(nukeTimeData.entries()) as [, data]}
  {@const isNuke = data.text === 'NUKE!'}
  {@const pulseOpacity = getPulseOpacity(isNuke)}
  {@const shieldTexture = shieldTextures[data.shieldType]}
  {@const shieldMaterial = new MeshBasicMaterial({
    map: shieldTexture,
    transparent: true,
    alphaTest: 0.1,
    opacity: pulseOpacity,
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
    opacity: pulseOpacity,
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
