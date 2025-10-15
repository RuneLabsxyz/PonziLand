<script lang="ts">
  import { Instance } from '@threlte/extras';
  import type { LandTile } from './landTile';

  let {
    tile,
    i,
    positionOffset = [0, 0, 0],
    scale = 1,
  }: {
    tile: LandTile;
    i: number;
    positionOffset?: [number, number, number];
    scale?: number;
  } = $props();

  let dropLandPosition: [number, number, number] = $derived([
    tile.position[0] + positionOffset[0],
    tile.position[1] + 0.05, // Slightly above the land
    tile.position[2] + positionOffset[2],
  ]);
</script>

<Instance position={dropLandPosition} rotation={[-Math.PI / 2, 0, 0]} {scale} />
