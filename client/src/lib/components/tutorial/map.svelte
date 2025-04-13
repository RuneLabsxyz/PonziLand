<script lang="ts">
  import account from '$lib/account.svelte';
  import type { LandsStore } from '$lib/api/land.svelte';
  import { useLands } from '$lib/api/land.svelte';
  import type { Tile } from '$lib/api/tile-store.svelte';
  import { cameraPosition, cameraTransition } from '$lib/stores/camera';
  import { claimStore } from '$lib/stores/claim.svelte';
  import { mousePosCoords } from '$lib/stores/stores.svelte';
  import { padAddress, toHexWithPadding } from '$lib/utils';
  import TileCell from './tile.svelte';
  import { tileState, MAP_SIZE } from './stores.svelte';

  let tiles = $derived(tileState.getTiles());

  const TILE_SIZE = 32;

  const MIN_SCALE = 2.0;
  const MAX_SCALE = 16;
  let isDragging = $state(false);
  let dragged = $state(false);
  let cameraEnabled = $state(false);
  let startX = 0;
  let startY = 0;

  let mapWrapper: HTMLElement;
  let landStore: LandsStore | undefined;

  function initializeCamera() {
    if (!mapWrapper) return;

    const containerWidth = mapWrapper.clientWidth;
    const containerHeight = mapWrapper.clientHeight;

    const scaleX = containerWidth / (MAP_SIZE * TILE_SIZE);
    const scaleY = containerHeight / (MAP_SIZE * TILE_SIZE);

    const fitScale = Math.min(scaleX, scaleY) * 5.5;

    const mapWidthScaled = MAP_SIZE * TILE_SIZE * fitScale;
    const mapHeightScaled = MAP_SIZE * TILE_SIZE * fitScale;

    cameraTransition.set(
      {
        scale: Math.max(MIN_SCALE, Math.min(MAX_SCALE, fitScale)),
        offsetX: (containerWidth - mapWidthScaled) / 2 - containerWidth * 0.098,
        offsetY:
          (containerHeight - mapHeightScaled) / 2 - containerHeight * 0.15,
      },
      { duration: 0 },
    );
  }

  $effect(() => {
    if (mapWrapper) {
      initializeCamera();
    }
  });

  function handleWheel(event: WheelEvent) {
    if (!cameraEnabled) return;
    event.preventDefault();
    let delta;

    if (event.deltaY > 0 && $cameraPosition.scale <= MIN_SCALE * 1.1) {
      return;
    }

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
    if (!cameraEnabled) return;
    dragged = false;
    isDragging = true;
    startX = event.clientX - $cameraPosition.offsetX;
    startY = event.clientY - $cameraPosition.offsetY;
  }

  function handleMouseMove(event: MouseEvent) {
    if (isDragging && cameraEnabled) {
      const newOffsetX = event.clientX - startX;
      const newOffsetY = event.clientY - startY;

      if (
        Math.abs(newOffsetX - $cameraPosition.offsetX) < 5 &&
        Math.abs(newOffsetY - $cameraPosition.offsetY) < 5
      ) {
        return;
      }
      dragged = true;
      updateOffsets(newOffsetX, newOffsetY);
    }

    if (!mapWrapper) return;

    const rect = mapWrapper.getBoundingClientRect();
    const mouseX = event.clientX - rect.left - $cameraPosition.offsetX;
    const mouseY = event.clientY - rect.top - $cameraPosition.offsetY;

    const tileX = Math.floor(mouseX / (TILE_SIZE * $cameraPosition.scale));
    const tileY = Math.floor(mouseY / (TILE_SIZE * $cameraPosition.scale));

    if (tileX >= 0 && tileX < MAP_SIZE && tileY >= 0 && tileY < MAP_SIZE) {
      $mousePosCoords = {
        x: tileX + 1,
        y: tileY + 1,
        location: tileY * MAP_SIZE + tileX,
      };
    } else {
      $mousePosCoords = null;
    }
  }

  function updateOffsets(newX: number, newY: number) {
    if (!mapWrapper) return;

    const mapWidth = MAP_SIZE * TILE_SIZE * $cameraPosition.scale;
    const mapHeight = MAP_SIZE * TILE_SIZE * $cameraPosition.scale;
    const containerWidth = mapWrapper.clientWidth;
    const containerHeight = mapWrapper.clientHeight;

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

<div class="overflow-hidden h-screen w-screen">
  <div class="map-wrapper" bind:this={mapWrapper}>
    <!-- Column numbers -->
    <div class="column-numbers" style="left: {$cameraPosition.offsetX}px">
      {#each Array(MAP_SIZE) as _, i}
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
      <div class="row-numbers" style="top: {$cameraPosition.offsetY}px">
        {#each Array(MAP_SIZE) as _, i}
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
        {#each tiles as row, y}
          <div class="row">
            {#each row as tile, x}
              <TileCell land={tile} {dragged} scale={$cameraPosition.scale} />
            {/each}
          </div>
        {/each}
      </button>
    </div>
  </div>
</div>

<style>
  .map-wrapper {
    position: relative;
    margin: 32px 0 0 32px;
    width: calc(100% - 32px);
    height: calc(100% - 32px);
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
  }

  .map-container:active {
    cursor: grabbing;
  }

  .row {
    display: flex;
  }
</style>
