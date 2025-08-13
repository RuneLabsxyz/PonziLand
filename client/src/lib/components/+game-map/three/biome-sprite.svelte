<script lang="ts">
  import { useInstancedSprite } from '@threlte/extras';
  import { useTask } from '@threlte/core';
  import * as THREE from 'three';
  import { cursorStore } from './cursor.store.svelte';
  import type { LandTile } from './landTile';
  import {
    setupOutlineShader,
    handleCursorState,
    type OutlineControls,
  } from './utils/sprite-hover-shader';

  let { landTiles, biomeSpritesheet } = $props();

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
          biomeSpritesheet.texture.width,
          biomeSpritesheet.texture.height,
        ),
      });
      shaderSetup = true;
    }

    // Set billboard rotation once for the entire sprite
    sprite.lookAt(0, 0.1, 0);

    landTiles.forEach((tile: LandTile, index: number) => {
      let animationName = tile.biomeAnimationName;

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
</script>
