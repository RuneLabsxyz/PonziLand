<script lang="ts">
  import { useTask } from '@threlte/core';
  import { useInstancedSprite } from '@threlte/extras';
  import type { LandTile } from './landTile';

  let { landTiles } = $props();

  const { updatePosition, sprite } = useInstancedSprite();

  useTask(() => {
    landTiles.forEach((tile: LandTile, index: number) => {
      let animationName = 'default';
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
