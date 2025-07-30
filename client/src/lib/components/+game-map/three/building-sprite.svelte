<script lang="ts">
  import { useTask } from '@threlte/core';
  import { HTML, useInstancedSprite } from '@threlte/extras';
  import { buildingAtlasMeta } from './buildings';
  import type { LandTile } from './landTile';
  import { cursorStore } from './cursor.store.svelte';
  import { Vector3 } from 'three';
  import { isInFrustum } from './utils/frustumCulling';
  import { useThrelte } from '@threlte/core';
  import { devsettings } from './utils/devsettings.store.svelte';

  let { landTiles, isUnzoomed = false, ownedLands = [] } = $props();

  // Get available animation names
  const buildingAnimations = buildingAtlasMeta.flatMap((item) =>
    item.animations.map((anim) => anim.name),
  );

  // Function to get scale based on hover state
  function getTileScale(tileIndex: number): [number, number] {
    return cursorStore.hoveredTileIndex === tileIndex ||
      cursorStore.selectedTileIndex === tileIndex
      ? [1.2, 1.2]
      : [1.0, 1.0];
  }

  const { updatePosition, sprite } = useInstancedSprite();

  // Helper to check if tile is owned
  function isOwnedTile(tile: LandTile): boolean {
    return ownedLands.some(ownedTile => ownedTile.land.locationString === tile.land.locationString);
  }

  $effect(() => {
    landTiles.forEach((tile: LandTile, index: number) => {
      // if (
      //   !isInFrustum(
      //     [tile.position[0], tile.position[1], tile.position[2]],
      //     $camera,
      //     devsettings.frustumPadding,
      //   )
      // ) {
      //   // Hide instance by scaling to zero
      //   updatePosition(
      //     index,
      //     [tile.position[0], -tile.position[2], tile.position[1]],
      //     [0, 0],
      //   );
      //   return;
      // }
      let animationName = tile.buildingAnimationName;
      
      if (
        cursorStore.hoveredTileIndex === index ||
        cursorStore.selectedTileIndex === index
      ) {
        animationName = animationName + '-outline';
      }
      const scale = getTileScale(index);
      updatePosition(index, [
        tile.position[0],
        -tile.position[2],
        tile.position[1],
      ]);
      sprite.lookAt(0, 0.1, 0);
      sprite.animation.setAt(index, animationName as any);
      
      // For now, we rely on visual feedback through animation names
      // The darker texture effect could be implemented by:
      // 1. Adding darker texture variants to the building atlas
      // 2. Or using a shader-based approach for dimming
      // 3. Or creating a semi-transparent dark overlay layer
    });
  });
</script>
