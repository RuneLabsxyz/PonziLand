<script lang="ts">
  import { useTask } from '@threlte/core';
  import { useInstancedSprite } from '@threlte/extras';
  import { biomeAtlasMeta } from './biomes';
  import { cursorStore } from './cursor.store.svelte';
  import type { LandTile } from './landTile';

  let { landTiles } = $props();

  function getBiomeAnimationOrFallback(
    tile: LandTile,
    availableAnimations: string[],
    tileIndex?: number,
  ): string {
    const derivedName = tile.getBiomeAnimationName();

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
  const biomeAnimations = biomeAtlasMeta.flatMap((item) =>
    item.animations.map((anim) => anim.name),
  );

  const { updatePosition, sprite } = useInstancedSprite();

  useTask(() => {
    // iterate over landtiles
    landTiles.forEach((tile: LandTile, index: number) => {
      const animationName = getBiomeAnimationOrFallback(
        tile,
        biomeAnimations,
        index,
      );

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
      sprite.animation.setAt(index, animationName);
    });
  });
</script>
