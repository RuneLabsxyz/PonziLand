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
  import { get } from 'svelte/store';

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

  // Reactive variable to store bounds
  let bounds = $state({
    minX: 0,
    minY: 0,
    maxX: GRID_SIZE - 1,
    maxY: GRID_SIZE - 1,
  });

  // Update bounds on mount and when relevant data changes
  onMount(() => {
    bounds = calculateBounds();
    // You can add additional logic here to update bounds when necessary
  });

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
    const endX = Math.ceil(
      (mapDimensions.width - offsetX) / (TILE_SIZE * scale),
    );
    const endY = Math.ceil(
      (mapDimensions.height - offsetY) / (TILE_SIZE * scale),
    );

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
            height: entry.contentRect.height,
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

  // Function to calculate the bounds of non-empty lands
  function calculateBounds() {
    let minX = GRID_SIZE;
    let minY = GRID_SIZE;
    let maxX = -1;
    let maxY = -1;

    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        const land = landStore.getLand(x, y);
        if (land && get(land).type !== 'empty') {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    minX--;
    minY--;
    maxX++;
    maxY++;

    return { minX, minY, maxX, maxY };
  }

  function updateOffsets(newX: number, newY: number) {
    if (!mapDimensions.width || !mapDimensions.height) return;

    // Calculate the bounds of non-empty lands
    let { minX, minY, maxX, maxY } = calculateBounds();

    console.log('Bounds:', {
      minX,
      minY,
      maxX,
      maxY,
    });

    minX--;
    minY--;
    maxX++;
    maxY++;

    // Calculate the maximum offsets based on the bounds of non-empty lands
    const maxOffsetX = (maxX + 1) * TILE_SIZE * $cameraPosition.scale;
    const maxOffsetY = (maxY + 1) * TILE_SIZE * $cameraPosition.scale;

    // Calculate the minimum offsets based on the bounds of non-empty lands
    const minOffsetX = minX * TILE_SIZE * $cameraPosition.scale;
    const minOffsetY = minY * TILE_SIZE * $cameraPosition.scale;

    // Ensure that the offsets are constrained correctly
    $cameraTransition = {
      ...$cameraPosition,
      offsetX: Math.max(-maxOffsetX, Math.min(-minOffsetX, newX)), // Constrain to maxOffsetX and minOffsetX
      offsetY: Math.max(-maxOffsetY, Math.min(-minOffsetY, newY)), // Constrain to maxOffsetY and minOffsetY
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
<div class="overflow-hidden h-screen w-screen full-layer">
  <div class="map-wrapper" bind:this={mapWrapper}>
    <!-- Column numbers -->
    <div
      class="column-numbers"
      style="transform: translateX({$cameraPosition.offsetX}px)"
    >
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
      <div
        class="row-numbers"
        style="transform: translateY({$cameraPosition.offsetY}px)"
      >
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
        class="map-container z-10"
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
        <!-- <div class="road-layer"></div> -->

        {#each Array(GRID_SIZE) as _, y}
          <div class="row">
            {#each Array(GRID_SIZE) as _, x}
              {@const land = landStore.getLand(x, y)!}

              <!-- Check if the current coordinates are out of bounds -->
              {#if x < bounds.minX || x > bounds.maxX || y < bounds.minY || y > bounds.maxY}
                <!-- Render an empty div if out of bounds -->
                <!-- <div
                    class="empty-tile"
                    style="width: {TILE_SIZE}px; height: {TILE_SIZE}px;"
                  ></div> -->
                <div
                  style="width: {TILE_SIZE}px; height: {TILE_SIZE}px; z-index: 10"
                  class="relative"
                >
                  <GameTile {land} {dragged} scale={$cameraPosition.scale} />
                </div>
              {:else}
                <!-- Render the GameTile if within bounds -->
                <div
                  style="width: {TILE_SIZE}px; height: {TILE_SIZE}px; z-index: 30"
                  class="relative"
                >
                  <GameTile {land} {dragged} scale={$cameraPosition.scale} />
                </div>
              {/if}
            {/each}
          </div>
        {/each}
        <div
          class="fog-layer-scaled"
          style="
            --grid-size: {TILE_SIZE}px;
            --camera-scale: {1 / $cameraPosition.scale};
          "
        ></div>
      </button>
    </div>
  </div>
</div>

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
    z-index: 22;
  }

  .column-numbers {
    display: flex;
    position: absolute;
    top: -32px;
    left: 0;
    gap: 0;
    padding-left: 0;
    z-index: 21;
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
    z-index: 21;
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

  /* Scaled fog layer that responds to camera position and scale */
  .fog-layer-scaled {
    position: absolute;
    top: 32px; /* Offset by coordinate header height */
    left: 32px; /* Offset by coordinate header width */
    width: calc(var(--grid-size) * 100); /* Adjust based on your grid size */
    height: calc(var(--grid-size) * 100);
    pointer-events: none;
    overflow: visible;
    transform-origin: 0 0;
    z-index: 15; /* Between map and UI elements */
  }

  /* Fog patterns using repeating background images */
  .fog-layer-scaled::before,
  .fog-layer-scaled::after {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background-image: url('/land-display/fog.jpg'); /* Replace with your fog texture */
    background-repeat: repeat;
    background-size: calc(var(--grid-size) * 2500) calc(var(--grid-size) * 2500); /* Pixelated: 512px tiles */
    image-rendering: pixelated;
    mix-blend-mode: screen;
  }

  /* First fog layer - slower movement */
  .fog-layer-scaled::before {
    animation: scaledFogDrift1 120s ease-in-out infinite alternate;
    opacity: calc(0.3 * var(--camera-scale));
    background-size: calc(var(--grid-size) * 2500) calc(var(--grid-size) * 2500); /* Pixelated: 512px tiles */
    image-rendering: pixelated;
  }

  /* Second fog layer - different speed and direction */
  .fog-layer-scaled::after {
    animation: scaledFogDrift2 180s ease-in-out infinite alternate-reverse;
    opacity: calc(0.2 * var(--camera-scale));
    background-size: calc(var(--grid-size) * 2500) calc(var(--grid-size) * 2500); /* Pixelated: 512px tiles */
    image-rendering: pixelated;
    background-image: url('/land-display/fog.jpg'); /* Different fog texture for variation */
  }

  /* Base fog layer with repeating background texture */
  .fog-layer-scaled {
    background-image: url('/land-display/fog.jpg'); /* Base fog texture */
    background-repeat: repeat;
    background-size: calc(var(--grid-size) * 8) calc(var(--grid-size) * 8); /* 256px at base scale */
    animation: scaledFogDrift3 200s linear infinite;
  }

  /* Keyframe animations for organic movement */
  @keyframes scaledFogDrift1 {
    0% {
      transform: translate(-5%, -5%) rotate(0deg) scale(1);
    }
    25% {
      transform: translate(3%, -3%) rotate(0.5deg) scale(1.02);
    }
    50% {
      transform: translate(-3%, 5%) rotate(-0.3deg) scale(0.99);
    }
    75% {
      transform: translate(4%, 3%) rotate(0.4deg) scale(1.01);
    }
    100% {
      transform: translate(-4%, -4%) rotate(-0.5deg) scale(1.005);
    }
  }

  @keyframes scaledFogDrift2 {
    0% {
      transform: translate(4%, 6%) rotate(0.3deg) scale(1.05);
    }
    20% {
      transform: translate(-6%, 4%) rotate(-0.2deg) scale(0.97);
    }
    40% {
      transform: translate(3%, -5%) rotate(0.4deg) scale(1.03);
    }
    60% {
      transform: translate(-4%, 3%) rotate(-0.3deg) scale(0.99);
    }
    80% {
      transform: translate(5%, -3%) rotate(0.2deg) scale(1.04);
    }
    100% {
      transform: translate(-3%, 5%) rotate(-0.1deg) scale(1.01);
    }
  }

  @keyframes scaledFogDrift3 {
    0% {
      background-position: 0% 0%;
    }
    25% {
      background-position: 25% 25%;
    }
    50% {
      background-position: 50% 0%;
    }
    75% {
      background-position: 75% 75%;
    }
    100% {
      background-position: 100% 0%;
    }
  }

  /* Enhanced scaling for very zoomed in states */
  @media (min-resolution: 2dppx) {
    .fog-layer-scaled {
      filter: blur(0.5px);
    }
  }

  /* Responsive fog intensity based on zoom level */
  .fog-layer-scaled {
    animation:
      scaledFogDrift3 200s linear infinite,
      scaledFogPulse 15s ease-in-out infinite alternate;
  }

  @keyframes scaledFogPulse {
    0% {
      opacity: calc(1 * var(--camera-scale));
    }
    100% {
      opacity: calc(2 * var(--camera-scale));
    }
  }

  .full-layer {
    background-color: #2a2a2a;
  }
</style>
