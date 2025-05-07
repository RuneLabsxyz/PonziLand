<script lang="ts">
  import { Layer, Stage } from 'svelte-konva';
  import Konva from 'konva';
  import type { LandTileStore } from '$lib/api/land_tiles.svelte';
  import { GRID_SIZE } from '$lib/const';
  import GridTile from './GridTile.svelte';
  import { onMount } from 'svelte';

  let config: Konva.StageConfig = $state({
    width: window.innerWidth,
    height: window.innerHeight,
    draggable: true, // Enable dragging for panning
  });

  let fps = $state(0);
  let handle: Konva.Stage | undefined = $state();
  let animation: Konva.Animation | undefined;

  let scale = $state(1);

  // Track if we need to update the stage size
  let resizeTimeout: ReturnType<typeof setTimeout>;

  function handleResize() {
    // Debounce resize events
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      config = {
        ...config,
        width: window.innerWidth,
        height: window.innerHeight,
      };
    }, 100);
  }

  function handleWheel(e: WheelEvent) {
    e.preventDefault();

    if (!handle) return;

    // Get pointer position relative to stage
    const pointer = handle.getPointerPosition();
    if (!pointer) return;

    const oldScale = scale;

    // Zoom in/out with a scale factor
    const scaleBy = 1.1;
    const newScale = e.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

    // Limit zoom scale range
    scale = Math.max(0.1, Math.min(newScale, 10));

    // Calculate new position to zoom toward the pointer
    const newPos = {
      x: pointer.x - ((pointer.x - handle.x()) / oldScale) * scale,
      y: pointer.y - ((pointer.y - handle.y()) / oldScale) * scale,
    };

    // Apply transformation
    handle.scale({ x: scale, y: scale });
    handle.position(newPos);
  }

  onMount(() => {
    // Add event listeners
    window.addEventListener('resize', handleResize);
    document.addEventListener('wheel', handleWheel, { passive: false });
  });

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
