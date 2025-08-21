<script lang="ts">
  import { useTask } from '@threlte/core';
  import { useInstancedSprite } from '@threlte/extras';
  import { untrack } from 'svelte';
  import type { LandTile } from './landTile';
  import { nukeStore } from '$lib/stores/nuke.store.svelte';

  let { landTiles } = $props();

  const { updatePosition, sprite } = useInstancedSprite();

  $effect(() => {
    // This effect only tracks nukeStore.nuking changes
    const nukingState = nukeStore.nuking;

    // Use untrack to access landTiles without creating a dependency on it
    const tiles = untrack(() => landTiles);

    tiles.forEach((tile: LandTile, index: number) => {
      const isNuking = nukingState[Number(tile.land.locationString)];
      let animationName = isNuking ? 'default' : 'empty';
      updatePosition(index, [
        tile.position[0],
        -tile.position[2],
        tile.position[1],
      ]);
      sprite.lookAt(0, 0.1, 0);
      sprite.animation.setAt(index, animationName);
    });
    sprite.update();
  });
</script>
