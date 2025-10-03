<script lang="ts">
  import { useTask } from '@threlte/core';
  import { useInstancedSprite } from '@threlte/extras';
  import { cursorStore } from './cursor.store.svelte';
  import type { LandTile } from './landTile';
  import { GRID_SIZE } from '$lib/const';

  let { landTiles } = $props();

  const { updatePosition, sprite } = useInstancedSprite();

  let materialCloned = false;

  $effect(() => {
    // Ensure road sprites have their own clean material without outline shaders
    if (sprite.material && !materialCloned) {
      sprite.material = sprite.material.clone();
      // Clear any existing onBeforeCompile hooks that might add outline shaders
      sprite.material.onBeforeCompile = () => {};
      materialCloned = true;
    }

    // Iterate over landtiles
    landTiles.forEach((tile: LandTile) => {
      // Calculate grid-based sprite index instead of array index
      const gridX = tile.position[0];
      const gridY = tile.position[2];
      const spriteIndex = gridX * GRID_SIZE + gridY;

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
</script>
