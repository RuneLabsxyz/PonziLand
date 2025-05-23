<script lang="ts">
  import { GRID_SIZE } from '$lib/const';

  import { TILE_SIZE } from '$lib/const';
  import {
    cameraPosition,
    cameraTransition,
    moveCameraToLocation,
  } from '$lib/stores/camera.store';
  import { onMount } from 'svelte';
  import GameTile from '$lib/components/+game-map/game-tile.svelte';
  import { landStore } from '$lib/stores/store.svelte';

  // Throttle mechanism
  let lastWheelTime = 0;
  const THROTTLE_DELAY = 10; // approximately 60fps

  // Camera position
  const MIN_SCALE = 0.6;
  const MAX_SCALE = 16;
  let isDragging = $state(false);
  let dragged = $state(false);
  let startX = 0;
  let startY = 0;

  // Map dimensions
  let mapDimensions = $state({ width: 0, height: 0 });
  let mapWrapper: HTMLElement;

  // Calculate visible tiles based on camera position and scale
  function getVisibleTiles() {
    if (!mapDimensions.width || !mapDimensions.height)
      return { startX: 0, startY: 0, endX: GRID_SIZE, endY: GRID_SIZE };

    const scale = $cameraPosition.scale;
    const offsetX = $cameraPosition.offsetX;
    const offsetY = $cameraPosition.offsetY;

    // Calculate visible area in tile coordinates
    const startX = Math.floor(-offsetX / (TILE_SIZE * scale));
    const startY = Math.floor(-offsetY / (TILE_SIZE * scale));
    const endX = Math.ceil((mapDimensions.width - offsetX) / (TILE_SIZE * scale));
    const endY = Math.ceil((mapDimensions.height - offsetY) / (TILE_SIZE * scale));

    // Add some padding to prevent pop-in
    const padding = 1;
    return {
      startX: Math.max(0, startX - padding),
      startY: Math.max(0, startY - padding),
      endX: Math.min(GRID_SIZE, endX + padding),
      endY: Math.min(GRID_SIZE, endY + padding),
    };
  }

  // Track visible tiles
  let visibleTiles = $state(getVisibleTiles());

  // Update visible tiles when camera changes
  $effect(() => {
    visibleTiles = getVisibleTiles();
  });

  onMount(() => {
    moveCameraToLocation(2080, 3);

    // Set up ResizeObserver
    if (mapWrapper) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          mapDimensions = {
            width: entry.contentRect.width,
            height: entry.contentRect.height
          };
        }
      });
      observer.observe(mapWrapper);
      return () => observer.disconnect();
    }
  });

  function handleWheel(event: WheelEvent) {
    event.preventDefault();

    // Throttle wheel events
    const now = Date.now();
    if (now - lastWheelTime < THROTTLE_DELAY) {
      return;
    }
    lastWheelTime = now;

    let delta;
    if (event.deltaY > 0) {
      if (event.deltaY < 5) {
        delta = 0.99;
      } else {
        delta = 0.9;
      }
    } else {
      if (event.deltaY > -5) {
        delta = 1.01;
      } else {
        delta = 1.1;
      }
    }
    const newScale = Math.max(
      MIN_SCALE,
      Math.min(MAX_SCALE, $cameraPosition.scale * delta),
    );

    // move the camera position towards the mouse position
    const rect = mapWrapper.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const cameraX = (mouseX - $cameraPosition.offsetX) / $cameraPosition.scale;
    const cameraY = (mouseY - $cameraPosition.offsetY) / $cameraPosition.scale;

    const newOffsetX = mouseX - cameraX * newScale;
    const newOffsetY = mouseY - cameraY * newScale;

    if (newScale !== $cameraPosition.scale) {
      cameraTransition.set(
        {
          ...$cameraPosition,
          scale: newScale,
          offsetX: newOffsetX,
          offsetY: newOffsetY,
        },
        {
          duration: 0,
        },
      );
      constrainOffset();
    }
  }

  function handleMouseDown(event: MouseEvent) {
    dragged = false;
    isDragging = true;
    startX = event.clientX - $cameraPosition.offsetX;
    startY = event.clientY - $cameraPosition.offsetY;
  }

  function handleMouseMove(event: MouseEvent) {
    if (isDragging) {
      const newOffsetX = event.clientX - startX;
      const newOffsetY = event.clientY - startY;

      // if difference is less than 5px, don't drag
      if (
        Math.abs(newOffsetX - $cameraPosition.offsetX) < 5 &&
        Math.abs(newOffsetY - $cameraPosition.offsetY) < 5
      ) {
        return;
      }
      dragged = true;
      updateOffsets(newOffsetX, newOffsetY);
    }
  }

  function updateOffsets(newX: number, newY: number) {
    if (!mapDimensions.width || !mapDimensions.height) return;

    const mapWidth = GRID_SIZE * TILE_SIZE * $cameraPosition.scale;
    const mapHeight = GRID_SIZE * TILE_SIZE * $cameraPosition.scale;
    const containerWidth = mapDimensions.width;
    const containerHeight = mapDimensions.height;

    const minX = Math.min(0, containerWidth - mapWidth);
    const minY = Math.min(0, containerHeight - mapHeight);

    $cameraTransition = {
      ...$cameraPosition,
      offsetX: Math.max(minX, Math.min(0, newX)),
      offsetY: Math.max(minY, Math.min(0, newY)),
    };
  }

  function constrainOffset() {
    updateOffsets($cameraTransition.offsetX, $cameraTransition.offsetY);
  }

  function handleMouseUp() {
    isDragging = false;
  }
</script>

<div class="scale-indicator">
  {Math.round($cameraPosition.scale * 100)}%
</div>
<div class="overflow-hidden h-screen w-screen">
  <div class="map-wrapper" bind:this={mapWrapper}>
    <!-- Column numbers -->
    <div class="column-numbers" style="transform: translateX({$cameraPosition.offsetX}px)">
      {#each Array(GRID_SIZE) as _, i}
        <div
          class="coordinate"
          style="width: {TILE_SIZE * $cameraPosition.scale}px"
        >
          {i}
        </div>
      {/each}
    </div>

    <div class="map-with-rows">
      <!-- Row numbers -->
      <div class="row-numbers" style="transform: translateY({$cameraPosition.offsetY}px)">
        {#each Array(GRID_SIZE) as _, i}
          <div
            class="coordinate"
            style="height: {TILE_SIZE * $cameraPosition.scale}px"
          >
            {i}
          </div>
        {/each}
      </div>

      <!-- Map container -->
      <!-- svelte-ignore a11y_no_interactive_element_to_noninteractive_role -->
      <button
        class="map-container"
        role="application"
        aria-label="Draggable map"
        onwheel={handleWheel}
        onmousedown={handleMouseDown}
        onmousemove={handleMouseMove}
        onmouseup={handleMouseUp}
        onmouseleave={handleMouseUp}
        style="transform: translate({$cameraPosition.offsetX}px, {$cameraPosition.offsetY}px) scale({$cameraPosition.scale});"
      >
        <!-- Road layer -->
        <div class="road-layer"></div>

        {#each Array(GRID_SIZE) as _, y}
          <div class="row">
            {#each Array(GRID_SIZE) as _, x}
              {@const land = landStore.getLand(x, y)!}
              <div
                style="width: {TILE_SIZE}px; height: {TILE_SIZE}px"
                class="relative"
              >
                {#if y >= visibleTiles.startY && y < visibleTiles.endY}
                  {#if x >= visibleTiles.startX && x < visibleTiles.endX}
                    <GameTile {land} {dragged} scale={$cameraPosition.scale} />
                  {/if}
                {/if}
              </div>
            {/each}
          </div>
        {/each}
      </button>
    </div>
  </div>
</div>

<!-- {#each Array(GRID_SIZE) as _, y}
  <div class="flex">
    {#each Array(GRID_SIZE) as _, x}
      {@const land = landStore.getLand(x, y)!}
      <div class="h-8 w-8">
        <GameTile {land} />
      </div>
    {/each}
  </div>
{/each} -->

<style>
  .map-wrapper {
    position: relative;
    margin: 32px 0 0 32px;
    /* margin: 20rem; */
    width: calc(100% - 4rem);
    height: calc(100% - 4rem);
  }

  .road-layer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: url('/land-display/road.png');
    background-size: 32px 32px;
    background-repeat: repeat;
    pointer-events: none;
  }

  .scale-indicator {
    position: absolute;
    top: 0;
    left: 0;
    background: #2a2a2a;
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    z-index: 50;
  }

  .column-numbers {
    display: flex;
    position: absolute;
    top: -32px;
    left: 0;
    gap: 0;
    padding-left: 0;
    z-index: 10;
    transform-origin: 0 0;
    background: #2a2a2a; /* Dark grey background */
    will-change: transform;
  }

  .row-numbers {
    position: absolute;
    left: -32px;
    top: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
    padding-top: 0;
    z-index: 10;
    transform-origin: 0 0;
    background: #2a2a2a; /* Dark grey background */
    will-change: transform;
  }

  .row-numbers .coordinate {
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .coordinate {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    color: #fff;
    flex-shrink: 0;
  }

  .map-with-rows {
    display: flex;
  }

  .map-container {
    display: flex;
    flex-direction: column;
    transform-origin: 0 0;
    cursor: grab;
    border: none;
    padding: 0;
    background: none;
    will-change: left, top;
  }

  .map-container:active {
    cursor: grabbing;
  }

  .row {
    display: flex;
  }
</style>
