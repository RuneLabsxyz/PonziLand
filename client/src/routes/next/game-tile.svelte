<script lang="ts">
  import type { BaseLand } from '$lib/api/land';
  import { BuildingLand } from '$lib/api/land/building_land';
  import NukeExplosion from '$lib/components/animation/nuke-explosion.svelte';
  import LandDisplay from '$lib/components/land/land-display.svelte';
  import LandNukeAnimation from '$lib/components/land/land-nuke-animation.svelte';
  import { GRID_SIZE, TILE_SIZE } from '$lib/const';
  import { nukeStore } from '$lib/stores/nuke.svelte';
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
        landCoordinates: { x: land.location.x, y: land.location.y },
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

  let isNuking = $derived.by(() => {
    console.log(`nuking ${land.location.x}:${land.location.y} `);
    return nukeStore.nuking[land.location.x + land.location.y * GRID_SIZE];
  });
</script>

<LandDisplay {...spriteProps} road />

{#if isNuking}
  {#if BuildingLand.is(land) && land.token}
    <NukeExplosion
      biomeX={land.token.images.biome.x}
      biomeY={land.token.images.biome.y}
      width={SIZE}
      height={SIZE}
    />
  {/if}
  <div class="absolute top-[-15%] right-0 w-full h-full z-20">
    <LandNukeAnimation />
  </div>
{/if}
