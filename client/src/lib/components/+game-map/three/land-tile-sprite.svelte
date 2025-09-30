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

  let {
    landTiles,
    spritesheet,
    animationProperty,
    ownedLandIndices = [],
    auctionLandIndices = [],
    isUnzoomed = false,
  }: {
    landTiles: LandTile[];
    spritesheet: any;
    animationProperty: string;
    ownedLandIndices: number[];
    auctionLandIndices: number[];
    isUnzoomed: boolean;
  } = $props();

  const { updatePosition, sprite } = useInstancedSprite();

  let shaderSetup = false;
  let outlineControls: OutlineControls | null = null;

  const clock = new THREE.Clock();

  useTask(() => {
    if (outlineControls) {
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
      const spriteIndex = gridX * GRID_SIZE + gridY;

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
</script>
