<script lang="ts">
  import type { LandsStore } from '$lib/api/land.svelte';
  import { type LandWithActions, useLands } from '$lib/api/land.svelte';
  import { cameraPosition } from '$lib/stores/camera';
  import { mousePosCoords } from '$lib/stores/stores.svelte';
  import { getTokenInfo, toHexWithPadding } from '$lib/utils';
  import Tile from './tile.svelte';

  const MAP_SIZE = 64;
  const TILE_SIZE = 32;
  let isDragging = false;
  let startX = 0;
  let startY = 0;

  // Add container ref to get dimensions
  let mapWrapper: HTMLElement;
  let landStore: LandsStore | undefined;
  try {
    landStore = useLands();
  } catch (e) {
    console.log('Error in map.svelte', e);
  }
  $inspect('landStore', $landStore);

  // Reactive state for the tiles
  let tiles = $state<
    Array<
      Array<
        Partial<LandWithActions> & {
          type: 'grass' | 'house' | 'auction';
          owner: string | undefined;
          sellPrice: number | null;
          tokenUsed: string | null;
          tokenAddress: string | null;
        }
      >
    >
  >([]);

  landStore?.subscribe((lands) => {
    // initialize the map with empty tiles
    tiles = Array(MAP_SIZE)
      .fill(null)
      .map((_, i) =>
        Array(MAP_SIZE)
          .fill(null)
          .map((_, j) => ({
            location: i * MAP_SIZE + j,
            type: 'grass',
            owner: undefined,
            sellPrice: null,
            tokenUsed: null,
            tokenAddress: null,
          })),
      );

    // fill the map with the lands
    lands.forEach((land) => {
      let location;
      if (typeof land.location === 'string') {
        location = parseInt(land.location);
      } else if (typeof land.location === 'bigint') {
        location = Number(land.location);
      } else {
        location = land.location;
      }

      let sellPrice;
      if (typeof land.sell_price === 'string') {
        sellPrice = parseInt(land.sell_price);
      } else if (typeof land.sell_price === 'bigint') {
        sellPrice = Number(land.sell_price);
      } else {
        sellPrice = land.sell_price;
      }

      const x = location % MAP_SIZE;
      const y = Math.floor(location / MAP_SIZE);
      tiles[y][x] = {
        ...land,
        type: land.owner == toHexWithPadding(0) ? 'auction' : 'house',
        owner: land.owner,
        sellPrice: sellPrice,
        tokenUsed: getTokenInfo(land.token_used)?.name ?? 'Unknown Token',
        tokenAddress: land.token_used,
      };
    });
  });

  function handleWheel(event: WheelEvent) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.5, Math.min(5, $cameraPosition.scale * delta));

    if (newScale !== $cameraPosition.scale) {
      $cameraPosition = {
        ...$cameraPosition,
        scale: newScale,
      };
      constrainOffset();
    }
  }

  function handleMouseDown(event: MouseEvent) {
    isDragging = true;
    startX = event.clientX - $cameraPosition.offsetX;
    startY = event.clientY - $cameraPosition.offsetY;
  }

  function handleMouseMove(event: MouseEvent) {
    if (isDragging) {
      const newOffsetX = event.clientX - startX;
      const newOffsetY = event.clientY - startY;
      updateOffsets(newOffsetX, newOffsetY);
    }

    if (mapWrapper) {
      const rect = mapWrapper.getBoundingClientRect();
      const mouseX = event.clientX - rect.left - $cameraPosition.offsetX;
      const mouseY = event.clientY - rect.top - $cameraPosition.offsetY;

      const tileX = Math.floor(mouseX / (TILE_SIZE * $cameraPosition.scale));
      const tileY = Math.floor(mouseY / (TILE_SIZE * $cameraPosition.scale));

      if (tileX >= 0 && tileX < MAP_SIZE && tileY >= 0 && tileY < MAP_SIZE) {
        $mousePosCoords = { x: tileX + 1, y: tileY + 1 };
      } else {
        $mousePosCoords = null;
      }
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

    $cameraPosition = {
      ...$cameraPosition,
      offsetX: Math.max(minX, Math.min(0, newX)),
      offsetY: Math.max(minY, Math.min(0, newY)),
    };
  }

  function constrainOffset() {
    updateOffsets($cameraPosition.offsetX, $cameraPosition.offsetY);
  }

  function handleMouseUp() {
    isDragging = false;
  }
</script>

<div class="map-wrapper" bind:this={mapWrapper}>
  <!-- Column numbers -->
  <div class="column-numbers" style="left: {$cameraPosition.offsetX}px">
    {#each Array(MAP_SIZE) as _, i}
      <div
        class="coordinate"
        style="width: {TILE_SIZE * $cameraPosition.scale}px"
      >
        {i + 1}
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
          {i + 1}
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
      style="transform: translate({$cameraPosition.offsetX}px, {$cameraPosition.offsetY}px) scale({$cameraPosition.scale})"
    >
      {#each tiles as row, y}
        <div class="row">
          {#each row as tile, x}
            <Tile
              land={tile}
            />
          {/each}
        </div>
      {/each}
    </button>
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
