<script lang="ts">
  import { Layer, Stage, Rect, Text } from 'svelte-konva';
  import Konva from 'konva';
  import type { LandTileStore } from '$lib/api/land_tiles.svelte';
  import { GRID_SIZE } from '$lib/const';
  import { onMount } from 'svelte';
  import GameTile from './game-tile.svelte';
  import { canvaStore } from './canva-store.svelte';

  let config: Konva.StageConfig = $state({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  let fps = $state(0);
  let animation: Konva.Animation | undefined;

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

    if (!canvaStore.layer || !canvaStore.stage) return;

    // Get pointer position relative to stage
    const pointer = canvaStore.stage.getPointerPosition();
    if (!pointer) return;

    const oldScale = canvaStore.scale;

    // Zoom in/out with a scale factor
    const scaleBy = 1.1;
    const newScale = e.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

    // Limit zoom scale range
    canvaStore.scale = Math.max(1, Math.min(newScale, 20));

    // Calculate new position to zoom toward the pointer
    const newPos = {
      x:
        pointer.x -
        ((pointer.x - canvaStore.layer.x()) / oldScale) * canvaStore.scale,
      y:
        pointer.y -
        ((pointer.y - canvaStore.layer.y()) / oldScale) * canvaStore.scale,
    };

    // Apply transformation
    canvaStore.layer.scale({ x: canvaStore.scale, y: canvaStore.scale });
    canvaStore.layer.position(newPos);
  }

  function throttle(func: Function, limit: number) {
    let inThrottle: boolean;
    return function (this: any, ...args: any[]) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  onMount(() => {
    // Add event listeners
    window.addEventListener('resize', handleResize);
    document.addEventListener('wheel', handleWheel, { passive: false });
  });

  // Add Konva stage dragmove listener with throttling
  $effect(() => {
    if (canvaStore.layer) {
      const stage = canvaStore.layer;
      const updatePosition = throttle(() => {
        canvaStore.position = { x: stage.x(), y: stage.y() };
      }, 5);

      stage.on('dragmove', updatePosition);
      // Set initial position
      updatePosition();
      return () => {
        stage.off('dragmove', updatePosition);
      };
    }
  });

  $effect(() => {
    if (animation !== undefined || canvaStore.layer == null) {
      return;
    }
    console.log('setting up animation!');
    animation = new Konva.Animation((frame) => {
      fps = frame?.frameRate ?? 0;
    }, canvaStore.layer);

    animation.start();
  });

  let {
    store,
  }: {
    store: LandTileStore;
  } = $props();
</script>

<div class="fixed top-2 left-2 bg-black/50 text-white p-2 rounded z-10">
  <div>FPS: {fps.toFixed(0)}</div>
  <div>Zoom: {(canvaStore.scale * 100).toFixed(0)}%</div>
  <div class="text-xs">Drag to pan • Scroll to zoom</div>
</div>

<Stage {config} bind:handle={canvaStore.stage}>
  <!-- Grid Layer -->
  <Layer config={{ imageSmoothingEnabled: false, draggable: true }} bind:handle={canvaStore.layer}>
    {#each Array(GRID_SIZE) as _, y}
      {#each Array(GRID_SIZE) as _, x}
        {@const land = store.getLand(x, y)!}
        <GameTile {land} />
      {/each}
    {/each}
  </Layer>
  
  <!-- Fixed Ruler Layer -->
  <Layer config={{ listening: false }}>
    <!-- X-axis ruler background -->
    <Rect
      config={{
        x: 0,
        y: 0,
        width: config.width,
        height: 16,
        fill: 'rgba(0, 0, 0, 0.5)',
      }}
    />
    <!-- Y-axis ruler background -->
    <Rect
      config={{
        x: 0,
        y: 0,
        width: 16,
        height: config.height,
        fill: 'rgba(0, 0, 0, 0.5)',
      }}
    />
    <!-- X-axis numbers -->
    {#each Array(GRID_SIZE) as _, x}
        <Text
          config={{
            x: x * 16 * canvaStore.scale + 16 + canvaStore.position.x,
            y: 8,
            text: x.toString(),
            fontSize: 8,
            fill: 'white',  
            align: 'center',
            verticalAlign: 'middle',
          }}
        />
    {/each}
    <!-- Y-axis numbers -->
    {#each Array(GRID_SIZE) as _, y}
        <Text
          config={{
            x: 8,
            y: y * 16 * canvaStore.scale + 16 + canvaStore.position.y,
            text: y.toString(),
            fontSize: 8,
            fill: 'white',
            align: 'center',
            verticalAlign: 'middle',
          }}
        />
    {/each}
  </Layer>
</Stage>
