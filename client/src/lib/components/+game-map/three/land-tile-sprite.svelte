<script lang="ts">
  import { useTask } from '@threlte/core';
  import { useInstancedSprite } from '@threlte/extras';
  import * as THREE from 'three';
  import { cursorStore } from './cursor.store.svelte';
  import type { LandTile } from './landTile';
  import { GRID_SIZE } from '$lib/const';
  import {
    handleCursorState,
    setupOutlineShader,
    type OutlineControls,
  } from './utils/sprite-hover-shader';
  import { setOutlineControls } from './utils/outline-controls.store.svelte';
  import { coordinatesToLocation } from '$lib/utils';
  import { devsettings } from './utils/devsettings.store.svelte';
  import { onDestroy } from 'svelte';

  let {
    landTiles,
    spritesheet,
    animationProperty,
    ownedLandIndices = [],
    auctionLandIndices = [],
    isUnzoomed = false,
    heatmapTintIndices = [],
    heatmapTintColors = [],
    heatmapOpacity = 1.0,
  }: {
    landTiles: LandTile[];
    spritesheet: any;
    animationProperty: string;
    ownedLandIndices: number[];
    auctionLandIndices: number[];
    isUnzoomed: boolean;
    heatmapTintIndices: number[];
    heatmapTintColors: number[];
    heatmapOpacity: number;
  } = $props();

  const { updatePosition, sprite } = useInstancedSprite();

  let shaderSetup = false;
  let outlineControls: OutlineControls | null = null;
  let colorObjects: THREE.Color[] = [];

  const clock = new THREE.Clock();

  useTask(() => {
    // Only run shader time updates if animations are enabled
    if (
      outlineControls &&
      devsettings.enableAnimations &&
      devsettings.enableShaderAnimations
    ) {
      outlineControls.updateTime(clock.getElapsedTime());
    }
  });

  $effect(() => {
    if (sprite.material && !shaderSetup) {
      outlineControls = setupOutlineShader(sprite.material, {
        resolution: new THREE.Vector2(
          spritesheet.texture.width,
          spritesheet.texture.height,
        ),
      });

      sprite.material.depthWrite = false; // Prevent z-fighting between layers

      // Register outline controls in the global store
      // Determine layer type from animation property
      const layer =
        animationProperty === 'buildingAnimationName' ? 'building' : 'biome';
      setOutlineControls(layer, outlineControls, sprite);

      shaderSetup = true;
    }

    sprite.lookAt(0, 0.1, 0);

    landTiles.forEach((tile: LandTile, index: number) => {
      // Calculate grid-based sprite index instead of array index
      const gridX = tile.position[0];
      const gridY = tile.position[2];
      const spriteIndex = coordinatesToLocation({ x: gridX, y: gridY });

      // choose between building animation name and biome animation name
      let animationName;
      if (animationProperty === 'buildingAnimationName') {
        animationName = tile.buildingAnimationName;
      } else if (animationProperty === 'biomeAnimationName') {
        animationName = tile.biomeAnimationName;
      }

      // Apply bottom padding for building animations
      const yOffset =
        animationProperty === 'buildingAnimationName'
          ? tile.buildingBottomPadding
          : 0;

      // Apply scale factor for building animations
      const scale =
        animationProperty === 'buildingAnimationName' ? tile.buildingScale : 1;

      updatePosition(
        spriteIndex,
        [tile.position[0], -tile.position[2] + yOffset, tile.position[1]],
        [scale, scale],
      );

      sprite.animation.setAt(spriteIndex, animationName as any);
    });
  });

  $effect(() => {
    const hoveredIndex = cursorStore.hoveredTileIndex ?? -1;
    const selectedIndex = cursorStore.selectedTileIndex ?? -1;
    handleCursorState(outlineControls, sprite, hoveredIndex, selectedIndex);
  });

  $effect(() => {
    if (outlineControls && sprite) {
      // Always call setOwnedLands to ensure proper clearing when list gets smaller
      outlineControls.setOwnedLands(sprite, ownedLandIndices, 0.4);
      // Set auction lands with different attributes (if supported by shader)
      outlineControls.setAuctionLands(sprite, auctionLandIndices);
    }
  });

  $effect(() => {
    if (outlineControls) {
      outlineControls.setZoomState(isUnzoomed);
    }
  });

  $effect(() => {
    if (outlineControls && sprite) {
      // Set opacity first
      outlineControls.setTintOpacity(heatmapOpacity);

      // Clear any existing tints first
      outlineControls.clearTints(sprite);

      if (heatmapTintIndices.length > 0 && heatmapTintColors.length > 0) {
        // Group indices by color to optimize shader calls
        const colorGroups = new Map<string, number[]>();

        for (let i = 0; i < heatmapTintIndices.length; i++) {
          const index = heatmapTintIndices[i];
          const colorStart = i * 3;

          if (colorStart + 2 < heatmapTintColors.length) {
            const r = heatmapTintColors[colorStart];
            const g = heatmapTintColors[colorStart + 1];
            const b = heatmapTintColors[colorStart + 2];
            const colorKey = `${r.toFixed(3)},${g.toFixed(3)},${b.toFixed(3)}`;

            if (!colorGroups.has(colorKey)) {
              colorGroups.set(colorKey, []);
            }
            colorGroups.get(colorKey)!.push(index);
          }
        }

        // Apply tints for each color group
        for (const [colorKey, indices] of colorGroups) {
          const [r, g, b] = colorKey.split(',').map(Number);
          const color = new THREE.Color(r, g, b);
          colorObjects.push(color); // Track for disposal
          outlineControls.setTints(sprite, indices, color);
        }
      }
    }
  });

  onDestroy(() => {
    // Stop clock
    clock.stop();

    // Clean up outline controls
    if (outlineControls) {
      // Remove from global store
      const layer =
        animationProperty === 'buildingAnimationName' ? 'building' : 'biome';
      setOutlineControls(layer, null, null);

      // Clear any shader modifications
      if (sprite?.material) {
        // Reset any shader uniforms or modifications
        outlineControls.clearTints(sprite);
        outlineControls.setOwnedLands(sprite, [], 0);
        outlineControls.setAuctionLands(sprite, []);
      }

      outlineControls = null;
    }

    // Clear color objects (though THREE.Color doesn't need explicit disposal)
    colorObjects = [];

    // Reset shader setup flag
    shaderSetup = false;
  });
</script>
