<script lang="ts">
  import { useInstancedSprite } from '@threlte/extras';
  import { useTask } from '@threlte/core';
  import { buildingAtlasMeta } from './buildings';
  import type { LandTile } from './landTile';
  import { cursorStore } from './cursor.store.svelte';
  import * as THREE from 'three';
  import {
    setupOutlineShader,
    handleCursorState,
    type OutlineControls,
  } from './utils/sprite-hover-shader';

  let { landTiles, buildingSpritesheet } = $props();

  const { updatePosition, sprite } = useInstancedSprite();

  let shaderSetup = false;
  let outlineControls: OutlineControls | null = null;

  const clock = new THREE.Clock();

  // Update time uniform for shader animations
  useTask(() => {
    if (outlineControls) {
      outlineControls.updateTime(clock.getElapsedTime());
    }
  });

  $effect(() => {
    if (sprite.material && !shaderSetup) {
      outlineControls = setupOutlineShader(sprite.material, {
        resolution: new THREE.Vector2(
          buildingSpritesheet.texture.width,
          buildingSpritesheet.texture.height,
        ),
      });
      shaderSetup = true;
    }

    // Set billboard rotation once for the entire sprite
    sprite.lookAt(0, 0.1, 0);

    landTiles.forEach((tile: LandTile, index: number) => {
      let animationName = tile.buildingAnimationName;

      // Set position
      updatePosition(index, [
        tile.position[0],
        -tile.position[2],
        tile.position[1],
      ]);

      // Set animation
      sprite.animation.setAt(index, animationName as any);
    });
  });

  // Reactive statement to handle cursor changes
  $effect(() => {
    const hoveredIndex = cursorStore.hoveredTileIndex ?? -1;
    const selectedIndex = cursorStore.selectedTileIndex ?? -1;
    handleCursorState(outlineControls, hoveredIndex, selectedIndex);
  });

  // The system now supports outlining multiple instances simultaneously
  // Both hovered and selected tiles will be outlined with different colors
  // - Selected: Green outline with cyan pulse
  // - Hovered: Red outline with yellow pulse
</script>
