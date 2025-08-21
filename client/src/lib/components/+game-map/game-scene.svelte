<script lang="ts">
  import { useThrelte } from '@threlte/core';
  import { interactivity } from '@threlte/extras';
  import { GRID_SIZE } from '$lib/const';
  import { cursorStore } from './three/cursor.store.svelte';
  import { gameStore } from './three/game.store.svelte';
  import { selectedLand, landStore } from '$lib/stores/store.svelte';
  import { gameSounds } from '$lib/stores/sfx.svelte';
  import LandSprite from './three/land-sprite.svelte';
  import { onMount } from 'svelte';
  import { Raycaster, Vector2, Vector3 } from 'three';
  import { get } from 'svelte/store';

  const { renderer, camera } = useThrelte();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.toneMapping = 1; // No tone mapping

  interactivity({
    filter: (hits) => {
      // Only return the first hit
      return hits.slice(0, 1);
    },
  });

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
          const gridId = gridX * GRID_SIZE + gridZ;
          cursorStore.gridPosition = { x: gridX, y: gridZ, id: gridId };

          // Set hoveredTileIndex to the gridId for direct mapping
          cursorStore.hoveredTileIndex = gridId;

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
        cursorStore.hoveredTileIndex = undefined;
        document.body.classList.remove('cursor-pointer');
      }
    } else {
      cursorStore.gridPosition = undefined;
      cursorStore.hoveredTileIndex = undefined;
      document.body.classList.remove('cursor-pointer');
    }
  }

  function handleCanvasClick() {
    // Set selectedTileIndex to the currently hovered tile
    if (cursorStore.hoveredTileIndex !== undefined) {
      // Get current land tiles synchronously to avoid subscription leak
      const landTiles = get(landStore.getAllLands());
      
      // Find the land tile that corresponds to our grid position
      if (cursorStore.gridPosition) {
        const tile = landTiles.find(
          (tile) =>
            tile.location.x === cursorStore.gridPosition!.x &&
            tile.location.y === cursorStore.gridPosition!.y,
        );

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

  onMount(() => {
    const canvas = renderer.domElement;
    canvas.addEventListener('mousemove', updateMousePosition);
    canvas.addEventListener('click', handleCanvasClick);

    return () => {
      canvas.removeEventListener('mousemove', updateMousePosition);
      canvas.removeEventListener('click', handleCanvasClick);
    };
  });
</script>

<slot />
<LandSprite />
