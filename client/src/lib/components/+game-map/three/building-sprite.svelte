<script lang="ts">
  import { useTask } from '@threlte/core';
  import { useInstancedSprite } from '@threlte/extras';
  import { buildingAtlasMeta } from './buildings';
  import type { LandTile } from './landTile';
  import { cursorStore } from './cursor.store.svelte';

  let { landTiles } = $props();

  function getBuildingAnimationOrFallback(
    tile: LandTile,
    availableAnimations: string[],
  ): string {
    const derivedName = tile.getBuildingAnimationName();
    if (availableAnimations.includes(derivedName)) {
      return derivedName;
    }
    return 'empty';
  }
  // Get available animation names
  const buildingAnimations = buildingAtlasMeta[0].animations.map(
    (anim) => anim.name,
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
      const animationName = getBuildingAnimationOrFallback(
        tile,
        buildingAnimations,
      );

      const scale = getTileScale(index);

      updatePosition(index, tile.position, scale);
      sprite.animation.setAt(index, animationName);
    });
  });
</script>
