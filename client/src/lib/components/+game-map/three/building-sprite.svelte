<script lang="ts">
  import { useTask } from '@threlte/core';
  import { HTML, useInstancedSprite } from '@threlte/extras';
  import { buildingAtlasMeta } from './buildings';
  import type { LandTile } from './landTile';
  import { cursorStore } from './cursor.store.svelte';
  import { Vector3 } from 'three';

  let { landTiles } = $props();

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

  useTask(() => {
    // iterate over landtiles
    landTiles.forEach((tile: LandTile, index: number) => {
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
      sprite.lookAt(
        0,
        0.1, // Adjusted to center the sprite vertically
        0,
      );
      sprite.animation.setAt(index, animationName as any);
    });
  });
</script>
