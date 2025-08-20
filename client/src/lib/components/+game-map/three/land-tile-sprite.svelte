<script lang="ts">
  import { useTask } from '@threlte/core';
  import { useInstancedSprite } from '@threlte/extras';
  import * as THREE from 'three';
  import { cursorStore } from './cursor.store.svelte';
  import type { LandTile } from './landTile';
  import {
    handleCursorState,
    setupOutlineShader,
    type OutlineControls,
  } from './utils/sprite-hover-shader';

  let {
    landTiles,
    spritesheet,
    animationProperty,
    ownedLandIndices = [],
    isUnzoomed = false,
  }: {
    landTiles: LandTile[];
    spritesheet: any;
    animationProperty: string;
    ownedLandIndices: number[];
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
      shaderSetup = true;
    }

    sprite.lookAt(0, 0.1, 0);

    landTiles.forEach((tile: LandTile, index: number) => {
      // choose between building animation name and biome animation name
      let animationName;
      if (animationProperty === 'buildingAnimationName') {
        animationName = tile.buildingAnimationName;
      } else if (animationProperty === 'biomeAnimationName') {
        animationName = tile.biomeAnimationName;
      }

      updatePosition(index, [
        tile.position[0],
        -tile.position[2],
        tile.position[1],
      ]);

      sprite.animation.setAt(index, animationName as any);
    });
  });

  $effect(() => {
    const hoveredIndex = cursorStore.hoveredTileIndex ?? -1;
    const selectedIndex = cursorStore.selectedTileIndex ?? -1;
    handleCursorState(outlineControls, hoveredIndex, selectedIndex);
  });

  $effect(() => {
    if (outlineControls && ownedLandIndices.length > 0) {
      outlineControls.setOwnedLands(ownedLandIndices, 0.4, true);
    }
  });

  $effect(() => {
    if (outlineControls) {
      outlineControls.setZoomState(isUnzoomed);
    }
  });
</script>
