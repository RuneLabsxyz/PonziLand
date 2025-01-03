<script lang="ts">
    import Tile from './tile.svelte';
    import { mockLandData } from '$lib/api/mock-land';
    import { mousePosCoords } from '$lib/stores/stores';
    import { cameraPosition } from '$lib/stores/camera';
    import {useLands} from '$lib/api/land.svelte';

    const MAP_SIZE = 64;
    const TILE_SIZE = 32;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    
    // Add container ref to get dimensions
    let mapWrapper: HTMLElement;
    let landStore;
    try {
        landStore = useLands();
    } catch (e) {
        console.log('Error in map.svelte', e);
    }
    $inspect('aaaaaaa', $landStore);

    const tiles = Array(MAP_SIZE).fill(null).map((_, row) => 
        Array(MAP_SIZE).fill(null).map((_, col) => {
            const index = row * MAP_SIZE + col;
            const landData = mockLandData[index];
            return {
                type: landData.owner ? 'house' : 'grass',
                owner: landData.owner,
                sellPrice: landData.sell_price,
                tokenUsed: landData.token_used,
                tokenAddress: landData.token_address
            };
        })
    );

    function handleWheel(event: WheelEvent) {
        event.preventDefault();
        const delta = event.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(0.5, Math.min(5, $cameraPosition.scale * delta));
        
        if (newScale !== $cameraPosition.scale) {
            $cameraPosition = {
                ...$cameraPosition,
                scale: newScale
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
            offsetY: Math.max(minY, Math.min(0, newY))
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
            <div class="coordinate" style="width: {TILE_SIZE * $cameraPosition.scale}px">
                {i + 1}
            </div>
        {/each}
    </div>

    <div class="map-with-rows">
        <!-- Row numbers -->
        <div class="row-numbers" style="top: {$cameraPosition.offsetY}px">
            {#each Array(MAP_SIZE) as _, i}
                <div class="coordinate" style="height: {TILE_SIZE * $cameraPosition.scale}px">
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
            on:wheel={handleWheel}
            on:mousedown={handleMouseDown}
            on:mousemove={handleMouseMove}
            on:mouseup={handleMouseUp}
            on:mouseleave={handleMouseUp}
            style="transform: translate({$cameraPosition.offsetX}px, {$cameraPosition.offsetY}px) scale({$cameraPosition.scale})"
        >
            {#each tiles as row, y}
                <div class="row">
                    {#each row as tile, x}
                        <Tile type={tile.type} location={x + y * MAP_SIZE} owner={tile.owner} sellPrice={tile.sellPrice} tokenUsed={tile.tokenUsed} tokenAddress={tile.tokenAddress} />
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
        width: calc(100% - 64px);
        height: calc(100% - 64px);
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
        background: #2a2a2a;  /* Dark grey background */
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
        background: #2a2a2a;  /* Dark grey background */
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
