<script lang="ts">
  import { useTask } from '@threlte/core';
  import { useInstancedSprite } from '@threlte/extras';
  import { biomeAtlasMeta } from './biomes';
  import { cursorStore } from './cursor.store.svelte';
  import type { LandTile } from './landTile';
  import { isInFrustum } from './utils/frustumCulling';
  import { useThrelte } from '@threlte/core';

  let { landTiles } = $props();

  // Get available animation names
  const biomeAnimations = biomeAtlasMeta.flatMap((item) =>
    item.animations.map((anim) => anim.name),
  );

  const { updatePosition, sprite } = useInstancedSprite();
  const { camera } = useThrelte();

  useTask(() => {
    // iterate over landtiles
    landTiles.forEach((tile: LandTile, index: number) => {
      if (
        !isInFrustum(
          [tile.position[0], tile.position[1], tile.position[2]],
          $camera,
        )
      ) {
        // Hide instance by scaling to zero
        updatePosition(
          index,
          [tile.position[0], -tile.position[2], tile.position[1]],
          [0, 0],
        );
        return;
      }
      let animationName = tile.biomeAnimationName;
      if (
        cursorStore.hoveredTileIndex === index ||
        cursorStore.selectedTileIndex === index
      ) {
        animationName = animationName + '-outline';
      }

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
      sprite.animation.setAt(index, animationName as any);
    });
  });
</script>
