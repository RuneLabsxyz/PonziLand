<script lang="ts">
  import { useTask } from '@threlte/core';
  import { useInstancedSprite } from '@threlte/extras';
  import { cursorStore } from './cursor.store.svelte';
  import type { LandTile } from './landTile';
  import { GRID_SIZE } from '$lib/const';
  import { coordinatesToLocation } from '$lib/utils';
  import { onDestroy } from 'svelte';
  import type { Material } from 'three';

  let { landTiles } = $props();

  const { updatePosition, sprite } = useInstancedSprite();

  let materialCloned = false;
  let clonedMaterial: Material | null = null;

  $effect(() => {
    // Ensure road sprites have their own clean material without outline shaders
    if (sprite.material && !materialCloned) {
      clonedMaterial = sprite.material.clone();
      sprite.material = clonedMaterial;
      // Clear any existing onBeforeCompile hooks that might add outline shaders
      sprite.material.onBeforeCompile = () => {};
      materialCloned = true;
    }

    // Iterate over landtiles
    landTiles.forEach((tile: LandTile) => {
      // Calculate grid-based sprite index instead of array index
      const gridX = tile.position[0];
      const gridY = tile.position[2];
      const spriteIndex = coordinatesToLocation({ x: gridX, y: gridY });

      updatePosition(spriteIndex, [
        tile.position[0],
        -tile.position[2],
        tile.position[1] - 0.003,
      ]);
      sprite.lookAt(
        0,
        0.1, // Adjusted to center the sprite vertically
        0,
      );
      sprite.animation.setAt(spriteIndex, 'default');
    });
  });

  onDestroy(() => {
    // Dispose cloned material
    if (clonedMaterial) {
      clonedMaterial.dispose();
      clonedMaterial = null;
    }

    // Reset flags
    materialCloned = false;
  });
</script>
