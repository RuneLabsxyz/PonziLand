<script lang="ts">
  import { useTask } from '@threlte/core';
  import { useInstancedSprite } from '@threlte/extras';
  import type { LandTile } from './landTile';

  let { landTiles } = $props();

  const { updatePosition, sprite } = useInstancedSprite();

  $effect(() => {
    landTiles.forEach((tile: LandTile, index: number) => {
      // Only show fog animation if land is empty
      let animationName = tile.land.type === 'empty' ? 'default' : 'empty';
      const scale: [number, number] =
        tile.land.type === 'empty' ? [1, 1] : [0, 0];
      updatePosition(
        index,
        [tile.position[0], -tile.position[2], tile.position[1]],
        scale,
      );
      sprite.lookAt(0, 0.1, 0);
      sprite.animation.setAt(index, animationName);
    });
  });
</script>
