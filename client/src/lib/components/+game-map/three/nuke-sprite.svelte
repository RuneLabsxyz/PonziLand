<script lang="ts">
  import { useTask } from '@threlte/core';
  import { useInstancedSprite } from '@threlte/extras';
  import { untrack } from 'svelte';
  import type { LandTile } from './landTile';
  import { nukeStore } from '$lib/stores/nuke.store.svelte';
  import { GRID_SIZE } from '$lib/const';

  let { landTiles } = $props();

  const { updatePosition, sprite } = useInstancedSprite();

  $effect(() => {
    // This effect only tracks nukeStore.nuking changes
    const nukingState = nukeStore.nuking;

    // Use untrack to access landTiles without creating a dependency on it
    const tiles = untrack(() => landTiles);

    tiles.forEach((tile: LandTile) => {
      // Calculate grid-based sprite index instead of array index
      const gridX = tile.position[0];
      const gridY = tile.position[2];
      const spriteIndex = gridX * GRID_SIZE + gridY;

      const isNuking = nukingState[Number(tile.land.locationString)];
      let animationName = isNuking ? 'default' : 'empty';
      updatePosition(spriteIndex, [
        tile.position[0],
        -tile.position[2],
        tile.position[1] + 0.001,
      ]);
      sprite.lookAt(0, 0.1, 0);
      sprite.animation.setAt(spriteIndex, animationName);
    });
    sprite.update();
  });
</script>
