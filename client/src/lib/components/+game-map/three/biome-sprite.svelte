<script lang="ts">
  import { useTask, useThrelte } from '@threlte/core';
  import { useInstancedSprite } from '@threlte/extras';
  import { biomeAtlasMeta } from './biomes';
  import { cursorStore } from './cursor.store.svelte';
  import type { LandTile } from './landTile';
  import { isInFrustum } from './utils/frustumCulling';
  import { devsettings } from './utils/devsettings.store.svelte';

  let { landTiles } = $props();

  const { updatePosition, sprite } = useInstancedSprite();
  const { camera } = useThrelte();

  $effect(() => {
    landTiles.forEach((tile: LandTile, index: number) => {
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
