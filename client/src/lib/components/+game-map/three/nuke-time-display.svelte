<script lang="ts">
  import { nukeTimeStore } from '$lib/stores/nuke-time.store.svelte';
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

  // Update the store with props
  $effect(() => {
    nukeTimeStore.setLandTiles(landTiles);
    nukeTimeStore.setDisplayMode(isShieldMode, isUnzoomed);
    nukeTimeStore.setCurrentUserAddress(currentUserAddress);
  });

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

  // Get data from the store
  let nukeTimeData = $derived(nukeTimeStore.nukeTimeData);

  // Start/stop periodic updates based on visible tiles
  $effect(() => {
    nukeTimeStore.startPeriodicUpdates();

    return () => {
      nukeTimeStore.stopPeriodicUpdates();
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
    nukeTimeStore.destroy();
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

  {@const shieldOffset = nukeTimeStore.isShieldMode
    ? [-0.2, 0, 0]
    : [0.4, 0, -0.4]};
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
    scale={nukeTimeStore.isShieldMode ? 1.5 : 1}
  />

  <!-- Text overlay -->
  <T.Mesh
    position={textPosition}
    rotation={[-Math.PI / 2, 0, 0]}
    geometry={textGeometry}
    material={textMaterial}
    scale={nukeTimeStore.isShieldMode ? 1.5 : 1}
  />
{/each}
