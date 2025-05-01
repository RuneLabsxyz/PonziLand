<script lang="ts">
  import { Layer, Stage } from 'svelte-konva';
  import Konva from 'konva';
  import type { LandTileStore } from '$lib/api/land_tiles.svelte';
  import { GRID_SIZE } from '$lib/const';
  import GridTile from './GridTile.svelte';

  let config: Konva.StageConfig = $state({
    width: 512,
    height: 512,
  });

  let fps = $state(0);
  let handle: Konva.Stage | undefined = $state();

  let animation: Konva.Animation | undefined;

  $effect(() => {
    if (animation !== undefined || handle == null) {
      return;
    }
    console.log('setting up animation!');
    animation = new Konva.Animation((frame) => {
      fps = frame?.frameRate ?? 0;
    }, handle);

    animation.start();
  });

  let {
    store,
  }: {
    store: LandTileStore;
  } = $props();
</script>

<div class="text-black">
  FPS: {fps.toFixed(0)}
</div>

<Stage {config} bind:handle>
  <Layer config={{ listening: false }}>
    {#each Array(GRID_SIZE) as _, y}
      {#each Array(GRID_SIZE) as _, x}
        {@const land = store.getLand(x, y)!}
        <GridTile {land} />
      {/each}
    {/each}
  </Layer>
</Stage>
