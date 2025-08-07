<script lang="ts">
  import { useTask } from '@threlte/core';
  import { useInstancedSprite } from '@threlte/extras';
  import { cursorStore } from './cursor.store.svelte';
  import type { LandTile } from './landTile';

  let { landTiles } = $props();

  function getRoadAnimationOrFallback(
    tile: LandTile,
    availableAnimations: string[],
    tileIndex?: number,
  ): string {
    // Since roads use a simple 'default' animation, we'll always use that
    // But you could extend this logic if you have different road types
    let name = 'default';

    // You could add logic here for different road states
    // For example, if you have different road animations based on connections:
    // const derivedName = tile.getRoadAnimationName();
    // if (availableAnimations.includes(derivedName)) {
    //   name = derivedName;
    // }

    // If hovered or selected, you could show a highlighted version
    if (
      cursorStore.hoveredTileIndex === tileIndex ||
      cursorStore.selectedTileIndex === tileIndex
    ) {
      // If you have outline versions of roads, uncomment below:
      // if (availableAnimations.includes('default-outline')) {
      //   name = 'default-outline';
      // }
    }

    return name;
  }

  // Road atlas only has 'default' animation based on your roadAtlasMeta
  const roadAnimations = ['default'];

  const { updatePosition, sprite } = useInstancedSprite();

  $effect(() => {
    // Iterate over landtiles
    landTiles.forEach((tile: LandTile, index: number) => {
      const animationName = getRoadAnimationOrFallback(
        tile,
        roadAnimations,
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
