<script lang="ts">
  import { GRID_SIZE } from '$lib/const';
  import { gameSounds } from '$lib/stores/sfx.svelte';
  import { landStore, selectedLand } from '$lib/stores/store.svelte';
  import { useThrelte } from '@threlte/core';
  import { interactivity } from '@threlte/extras';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { Raycaster, Vector2, Vector3 } from 'three';
  import { cursorStore } from './three/cursor.store.svelte';
  import { gameStore } from './three/game.store.svelte';
  import LandSprite from './three/land-sprite.svelte';
  import { toLocation } from '$lib/api/land/location';
  import { coordinatesToLocation } from '$lib/utils';

  let { children = undefined } = $props();

  const { renderer, camera } = useThrelte();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.toneMapping = 1; // No tone mapping

  interactivity({
    filter: (hits) => {
      // Only return the first hit
      return hits.slice(0, 1);
    },
  });

  let startPosition: { x: number; y: number } | undefined = $state(undefined);

  // Raycaster for mouse position detection
  const raycaster = new Raycaster();
  const mouse = new Vector2();

  function updateMousePosition(event: MouseEvent) {
    if (!$camera) return;

    // Get canvas bounds
    const canvas = renderer.domElement;
    const rect = canvas.getBoundingClientRect();

    // Convert mouse position to normalized device coordinates (-1 to +1)
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Cast ray from camera through mouse position
    raycaster.setFromCamera(mouse, $camera);

    // Create a temporary plane at y=1 (same level as the grid)
    const intersectionPoint = new Vector3();
    const gridPlane = new Vector3(0, 1, 0); // Normal pointing up
    const planePoint = new Vector3(0, 1, 0); // Point on the plane

    // Calculate intersection with the y=1 plane
    const ray = raycaster.ray;
    const denominator = gridPlane.dot(ray.direction);

    if (Math.abs(denominator) > 0.0001) {
      const t = planePoint.clone().sub(ray.origin).dot(gridPlane) / denominator;
      if (t >= 0) {
        intersectionPoint.copy(ray.origin).add(ray.direction.multiplyScalar(t));
        cursorStore.absolutePosition = {
          x: intersectionPoint.x,
          y: intersectionPoint.z,
        };
        // Convert world position to grid coordinates with -0.5 offset
        // The grid starts at (0,0) and goes to (GRID_SIZE-1, GRID_SIZE-1)
        const gridX = Math.floor(intersectionPoint.x + 0.5);
        const gridZ = Math.floor(intersectionPoint.z + 0.5);

        // Check if the position is within the grid bounds
        if (
          gridX >= 0 &&
          gridX < GRID_SIZE &&
          gridZ >= 0 &&
          gridZ < GRID_SIZE
        ) {
          const gridId = coordinatesToLocation({ x: gridX, y: gridZ });
          cursorStore.gridPosition = { x: gridX, y: gridZ, id: gridId };

          // hoveredTileIndex will be calculated in land-sprite.svelte based on visibleLandTiles

          // Add cursor pointer styling when hovering over valid grid
          document.body.classList.add('cursor-pointer');
        } else {
          cursorStore.gridPosition = undefined;
          cursorStore.hoveredTileIndex = undefined;

          // Remove cursor pointer styling when outside grid
          document.body.classList.remove('cursor-pointer');
        }
      } else {
        cursorStore.gridPosition = undefined;
        cursorStore.absolutePosition = undefined;
        cursorStore.hoveredTileIndex = undefined;
        document.body.classList.remove('cursor-pointer');
      }
    } else {
      cursorStore.gridPosition = undefined;
      cursorStore.absolutePosition = undefined;
      cursorStore.hoveredTileIndex = undefined;
      document.body.classList.remove('cursor-pointer');
    }
  }

  function handleCanvasClick(e: PointerEvent) {
    if (startPosition != undefined) {
      const distance =
        Math.abs(e.clientX - startPosition.x) +
        Math.abs(e.clientY - startPosition.y);

      startPosition = undefined;

      if (distance > Math.pow(5, 2)) {
        console.log('Skipped due to big drag');
        return;
      }
    }

    // Set selectedTileIndex to the currently hovered tile
    if (cursorStore.hoveredTileIndex !== undefined) {
      // Get current land tiles synchronously to avoid subscription leak
      const landTiles = get(landStore.getCurrentLands());

      // Find the land tile that corresponds to our grid position
      if (cursorStore.gridPosition) {
        const tile =
          landTiles[cursorStore.gridPosition.x][cursorStore.gridPosition.y];

        if (tile) {
          selectedLand.value = tile;
          gameSounds.play('biomeSelect');

          // Handle camera movement if gameStore.cameraControls exists
          if (gameStore.cameraControls) {
            gameStore.cameraControls.setLookAt(
              cursorStore.gridPosition.x,
              50, // Slightly above the tile
              cursorStore.gridPosition.y,
              cursorStore.gridPosition.x,
              1, // Ground level
              cursorStore.gridPosition.y,
              true,
            );

            if (
              cursorStore.selectedTileIndex === cursorStore.hoveredTileIndex
            ) {
              gameStore.cameraControls.zoomTo(250, true);
            }
          }
        }
      }
      cursorStore.selectedTileIndex = cursorStore.hoveredTileIndex;
    } else {
      cursorStore.selectedTileIndex = undefined;
    }
  }

  function handleMouseDown(e: MouseEvent) {
    startPosition = { x: e.clientX, y: e.clientY };
  }

  onMount(() => {
    const canvas = renderer.domElement;
    canvas.addEventListener('mousemove', updateMousePosition);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('click', handleCanvasClick);

    return () => {
      canvas.removeEventListener('mousemove', updateMousePosition);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('click', handleCanvasClick);
    };
  });
</script>

{@render children?.()}
<LandSprite />
