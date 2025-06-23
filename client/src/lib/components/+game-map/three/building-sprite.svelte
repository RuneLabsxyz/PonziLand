<script lang="ts">
  import { useTask } from '@threlte/core';
  import { useInstancedSprite } from '@threlte/extras';
  import { buildingAtlasMeta } from './buildings';
  import type { LandTile } from './landTile';

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

  const { updatePosition, sprite } = useInstancedSprite();

  useTask(() => {
    // iterate over landtiles
    landTiles.forEach((tile: LandTile, index: number) => {
      const animationName = getBuildingAnimationOrFallback(
        tile,
        buildingAnimations,
      );

      updatePosition(index, tile.position);
      sprite.animation.setAt(index, animationName);
    });
  });
</script>
