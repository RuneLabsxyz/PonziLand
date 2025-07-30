<script lang="ts">
  import { useTask, useThrelte } from '@threlte/core';
  import { useInstancedSprite } from '@threlte/extras';
  import { biomeAtlasMeta } from './biomes';
  import { cursorStore } from './cursor.store.svelte';
  import type { LandTile } from './landTile';
  import { isInFrustum } from './utils/frustumCulling';
  import { devsettings } from './utils/devsettings.store.svelte';

  let { landTiles, isUnzoomed = false, ownedLands = [] } = $props();

  const { updatePosition, sprite } = useInstancedSprite();
  const { camera } = useThrelte();

  // Helper to check if tile is owned
  function isOwnedTile(tile: LandTile): boolean {
    return ownedLands.some(ownedTile => ownedTile.land.locationString === tile.land.locationString);
  }

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
      
      // For now, we rely on visual feedback through animation names
      // The darker texture effect could be implemented by:
      // 1. Adding darker texture variants to the biome atlas
      // 2. Or using a shader-based approach for dimming
      // 3. Or creating a semi-transparent dark overlay layer
    });
  });
</script>
