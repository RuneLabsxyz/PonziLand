<script lang="ts">
  import type { BaseLand } from '$lib/api/land';
  import { BuildingLand } from '$lib/api/land/building_land';
  import LandDisplay from '$lib/components/land/land-display.svelte';
  import { TILE_SIZE } from '$lib/const';
  import type { Readable } from 'svelte/store';

  const SIZE = TILE_SIZE;

  const {
    land: landStore,
    dragged,
    scale,
  }: { land: Readable<BaseLand>; dragged?: boolean; scale?: number } = $props();

  let land = $derived($landStore);

  // Determine which props to pass to LandSprite based on land type
  let spriteProps = $derived.by(() => {
    const baseProps = {
      config: {
        x: SIZE * land.location.x,
        y: SIZE * land.location.y,
        width: SIZE,
        height: SIZE,
      },
      seed: `${land.location.x},${land.location.y}`,
    };

    switch (land.type) {
      case 'empty':
        return { ...baseProps, grass: true };
      case 'auction':
        return { ...baseProps, auction: true };
      case 'building':
        if (BuildingLand.is(land)) {
          return {
            ...baseProps,
            token: land.token,
            level: land.level,
          };
        }
      default:
        return { ...baseProps, basic: true };
    }
  });
</script>

<LandDisplay {...spriteProps} road />
