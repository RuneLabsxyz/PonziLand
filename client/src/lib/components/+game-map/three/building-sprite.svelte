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
    tileIndex?: number,
  ): string {
    const derivedName = tile.getBuildingAnimationName();
    let name = 'empty';

    if (availableAnimations.includes(derivedName)) {
      name = derivedName;
    }

    // if hovered or selected, use the derived name
    if (
      cursorStore.hoveredTileIndex === tileIndex ||
      cursorStore.selectedTileIndex === tileIndex
    ) {
      if (availableAnimations.includes(derivedName + '-outline')) {
        name = derivedName + '-outline';
      }
    }
    return name;
  }
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
      const animationName = getBuildingAnimationOrFallback(
        tile,
        buildingAnimations,
        index,
      );

      const scale = getTileScale(index);

      updatePosition(index, tile.position);
      sprite.animation.setAt(index, animationName);
    });
  });
</script>
