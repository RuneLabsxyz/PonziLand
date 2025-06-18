<script lang="ts">
  import { useTask } from '@threlte/core';
  import { useInstancedSprite } from '@threlte/extras';
  import type { LandTile } from './landTile';
  import { nukeStore } from '$lib/stores/nuke.store.svelte';

  let { landTiles } = $props();

  const { updatePosition, sprite } = useInstancedSprite();

  $effect(() => {
    landTiles.forEach((tile: LandTile, index: number) => {
      // Only show nuke animation if nukeStore.nuking has the land
      const isNuking = nukeStore.nuking[Number(tile.land.locationString)];
      let animationName = isNuking ? 'default' : 'empty';
      updatePosition(index, [
        tile.position[0],
        -tile.position[2],
        tile.position[1],
      ]);
      sprite.lookAt(0, 0.1, 0);
      sprite.animation.setAt(index, animationName);
    });
  });
</script>
