<script lang="ts">
  import { useTask } from '@threlte/core';
  import { useInstancedSprite } from '@threlte/extras';
  import { GRID_SIZE } from '$lib/const';
  import { nukeStore } from '$lib/stores/nuke.store.svelte';
  import { cursorStore } from './cursor.store.svelte';
  import type { LandTile } from './landTile';

  let { landTiles } = $props();

  function getNukeAnimationOrFallback(
    tile: LandTile,
    availableAnimations: string[],
    tileIndex?: number,
  ): string {
    // Check if this tile is currently nuking
    const isNuking = nukeStore.nuking[tileIndex];

    // If not nuking, return empty/transparent animation
    if (!isNuking) {
      return 'empty'; // or 'transparent' if you have that animation
    }

    // Use 'default' animation for nuke sprites when nuking
    let name = 'default';

    // You could add logic here for different nuke states
    // For example, if you have different nuke animations based on explosion phases:
    // const derivedName = tile.getNukeAnimationName();
    // if (availableAnimations.includes(derivedName)) {
    //   name = derivedName;
    // }

    // If hovered or selected, you could show a highlighted version
    if (
      cursorStore.hoveredTileIndex === tileIndex ||
      cursorStore.selectedTileIndex === tileIndex
    ) {
      // If you have outline versions of nuke animations, uncomment below:
      // if (availableAnimations.includes('default-outline')) {
      //   name = 'default-outline';
      // }
    }

    return name;
  }

  // Nuke atlas animations - add 'empty' for when not nuking
  const nukeAnimations = ['default', 'empty'];

  const { updatePosition, sprite } = useInstancedSprite();

  useTask(() => {
    // Iterate over landtiles
    landTiles.forEach((tile: LandTile, index: number) => {
      const animationName = getNukeAnimationOrFallback(
        tile,
        nukeAnimations,
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
      sprite.play(animationName, false, 'FORWARD');
      sprite.animation.setAt(index, animationName);
    });
  });
</script>
