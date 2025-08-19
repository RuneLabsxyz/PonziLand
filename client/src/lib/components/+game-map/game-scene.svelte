<script lang="ts">
  import { useThrelte } from '@threlte/core';
  import { interactivity } from '@threlte/extras';
  import { GRID_SIZE } from '$lib/const';
  import { cursorStore } from './three/cursor.store.svelte';
  import LandSprite from './three/land-sprite.svelte';
  import { onMount } from 'svelte';
  import { Raycaster, Vector2, Vector3 } from 'three';

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

        // Convert world position to grid coordinates
        // The grid starts at (0,0) and goes to (GRID_SIZE-1, GRID_SIZE-1)
        const gridX = Math.floor(intersectionPoint.x);
        const gridZ = Math.floor(intersectionPoint.z);

        // Check if the position is within the grid bounds
        if (gridX >= 0 && gridX < GRID_SIZE && gridZ >= 0 && gridZ < GRID_SIZE) {
          const gridId = gridZ * GRID_SIZE + gridX;
          cursorStore.gridPosition = { x: gridX, y: gridZ, id: gridId };
        } else {
          cursorStore.gridPosition = undefined;
        }
      } else {
        cursorStore.gridPosition = undefined;
      }
    } else {
      cursorStore.gridPosition = undefined;
    }
  }

  onMount(() => {
    const canvas = renderer.domElement;
    canvas.addEventListener('mousemove', updateMousePosition);

    return () => {
      canvas.removeEventListener('mousemove', updateMousePosition);
    };
  });
</script>

<slot />
<LandSprite />
