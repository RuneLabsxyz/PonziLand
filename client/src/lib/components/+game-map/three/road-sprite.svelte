<script lang="ts">
  import { useTask } from '@threlte/core';
  import { useInstancedSprite } from '@threlte/extras';
  import { cursorStore } from './cursor.store.svelte';
  import type { LandTile } from './landTile';

  let { landTiles } = $props();

  // Road atlas only has 'default' animation based on your roadAtlasMeta
  const roadAnimations = ['default'];

  const { updatePosition, sprite } = useInstancedSprite();

  $effect(() => {
    // Iterate over landtiles
    landTiles.forEach((tile: LandTile, index: number) => {
      updatePosition(index, [
        tile.position[0],
        -tile.position[2],
        tile.position[1],
      ]);
      sprite.lookAt(
        0,
        0.1, // Adjusted to center the sprite vertically
        0,
      );
      sprite.animation.setAt(index, 'default');
    });
  });
</script>
