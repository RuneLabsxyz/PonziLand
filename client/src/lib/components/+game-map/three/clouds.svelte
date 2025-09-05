<script lang="ts">
  import { T, useTask } from '@threlte/core';
  import { useGltf } from '@threlte/extras';
  import {
    Object3D,
    InstancedMesh as TInstancedMesh,
    Vector3,
    PlaneGeometry,
    MeshStandardMaterial,
    Mesh,
    Shape,
    ShapeGeometry,
    DoubleSide,
  } from 'three';
  import type * as THREE from 'three';
  import { gameStore } from './game.store.svelte';
  import { cursorStore } from './cursor.store.svelte';
  import { onMount } from 'svelte';
  import seedrandom from 'seedrandom';

  interface Props {
    bounds: {
      minX: number;
      maxX: number;
      minY: number;
      maxY: number;
    } | null;
  }

  let { bounds }: Props = $props();

  const CLOUDS_HEIGHT = 4; // Position clouds above the grid
  const CLOUD_SPACING = 4; // Distance between clouds in grid
  const LAND_EXCLUSION_PADDING = 10; // Extra padding around land bounds
  const CLOUD_POSITION_OFFSET = 0; // Offset for cloud positioning
  const MAX_INSTANCES = 256 ** 2; // Max instances for instanced mesh
  const MAX_INFLUENCE_DISTANCE = 10; // Maximum distance for mouse influence
  const PLANE_SIZE = 500; // Size of the colored planes
  const CLOUD_COLOR = '#110D31'; // Light blue-gray color for cloud planes

  // Load clouds GLB using useGltf hook with proper typing
  const gltf = useGltf<{
    nodes: {
      Cube001: THREE.Mesh;
    };
    materials: {
      Material: THREE.Material;
    };
  }>('/models/clouds.glb');

  let cloudsInstancedMesh: TInstancedMesh | undefined = $state();
  let cloudMeshSize: Vector3 | undefined = $state();
  let cameraPosition = $state({ x: 0, z: 0 }); // Reactive camera position
  let currentRenderDistance = $state({ x: 50, z: 50 }); // Default render distances
  let screenSize = $state({ width: 1920, height: 1080 }); // Default screen size
  let time = $state(0); // Time for cloud animation
  let cloudPlanes: Mesh[] = $state([]); // Array of cloud planes

  // Cache for pre-computed random values to avoid expensive RNG calls
  const randomCache = new Map<
    string,
    {
      offsetX: number;
      offsetZ: number;
      heightVariation: number;
      scale: number;
      rotation: number;
      opacity: number;
      timeOffset: number;
      timeOffset2: number;
      timeOffset3: number;
    }
  >();

  // Cache for edge positions - only recalculate when bounds change
  let cachedEdgePositions: { x: number; z: number }[] = [];
  let cachedBoundsKey = '';

  // Cache for geometries - only recreate when necessary
  let cachedPlaneGeometries: any[] = [];
  let cachedGeometryKey = '';

  // Function to get cached random values for a position
  function getCachedRandomValues(x: number, z: number, isEdge = false) {
    const key = isEdge ? `edge-${x},${z}` : `${x},${z}`;

    if (!randomCache.has(key)) {
      // Only create RNG instance once per position and cache all values
      const rng = seedrandom(key);
      randomCache.set(key, {
        offsetX: (rng() - 0.5) * CLOUD_SPACING * 0.8,
        offsetZ: (rng() - 0.5) * CLOUD_SPACING * 0.8,
        heightVariation: (rng() - 0.5) * 3,
        scale: 0.8 + rng() * 0.4,
        rotation: Math.floor(rng() * 4) * (Math.PI / 2),
        opacity: 0.7 + rng() * 0.3,
        timeOffset: rng() * Math.PI * 2,
        timeOffset2: rng() * Math.PI * 2,
        timeOffset3: rng() * Math.PI * 2,
      });
    }

    return randomCache.get(key)!;
  }

  // Function to generate edge positions - cached by bounds
  function generateEdgePositions(bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  }) {
    const boundsKey = `${bounds.minX},${bounds.maxX},${bounds.minY},${bounds.maxY}`;

    if (cachedBoundsKey === boundsKey && cachedEdgePositions.length > 0) {
      return cachedEdgePositions;
    }

    // Define padded land bounds
    const paddedMinX = bounds.minX - LAND_EXCLUSION_PADDING;
    const paddedMaxX = bounds.maxX + LAND_EXCLUSION_PADDING;
    const paddedMinZ = bounds.minY - LAND_EXCLUSION_PADDING;
    const paddedMaxZ = bounds.maxY + LAND_EXCLUSION_PADDING;

    const edgePositions = [];

    // Reduced density and rings for better performance
    const numRings = 2; // Reduced from 3 to 2
    const ringSpacing = CLOUD_SPACING * 0.8; // Slightly wider spacing
    const densitySpacing = CLOUD_SPACING * 1.2; // Increased from 0.8 to 1.2 for less density

    for (let ring = 0; ring < numRings; ring++) {
      const ringOffset = ring * ringSpacing;
      const currentMinX = paddedMinX - ringOffset;
      const currentMaxX = paddedMaxX + ringOffset;
      const currentMinZ = paddedMinZ - ringOffset;
      const currentMaxZ = paddedMaxZ + ringOffset;

      // Pre-calculate counts to avoid repeated Math.ceil calls
      const width = currentMaxX - currentMinX;
      const height = currentMaxZ - currentMinZ;
      const topCount = Math.ceil(width / densitySpacing) + 1;
      const bottomCount = topCount; // Same as top
      const leftCount = Math.ceil(height / densitySpacing) - 1;
      const rightCount = leftCount; // Same as left

      // Generate edges with pre-calculated values
      // Top edge
      for (let i = 0; i < topCount; i++) {
        edgePositions.push({
          x: currentMinX + (i * width) / (topCount - 1),
          z: currentMinZ,
        });
      }

      // Bottom edge
      for (let i = 0; i < bottomCount; i++) {
        edgePositions.push({
          x: currentMinX + (i * width) / (bottomCount - 1),
          z: currentMaxZ,
        });
      }

      // Left edge (excluding corners)
      for (let i = 1; i <= leftCount; i++) {
        edgePositions.push({
          x: currentMinX,
          z: currentMinZ + (i * height) / (leftCount + 1),
        });
      }

      // Right edge (excluding corners)
      for (let i = 1; i <= rightCount; i++) {
        edgePositions.push({
          x: currentMaxX,
          z: currentMinZ + (i * height) / (rightCount + 1),
        });
      }
    }

    // Cache the results
    cachedEdgePositions = edgePositions;
    cachedBoundsKey = boundsKey;

    return edgePositions;
  }

  // Set up camera controls update event listener
  onMount(() => {
    // Initialize screen size
    const updateScreenSize = () => {
      screenSize = {
        width: window.innerWidth,
        height: window.innerHeight,
      };
    };

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);

    const updateCameraPosition = () => {
      if (gameStore.cameraControls?.camera) {
        const cam = gameStore.cameraControls.camera;
        const newX = cam.position.x;
        const newZ = cam.position.z;

        // Calculate render distance based on screen size and zoom only
        const zoom = cam.zoom || 100;

        // Calculate render distances directly from screen dimensions and zoom
        // X axis corresponds to screen height, Z axis to screen width
        // Higher zoom = smaller render distance (more zoomed in = see less area)
        const newRenderDistanceZ = Math.max(
          LAND_EXCLUSION_PADDING * 2,
          screenSize.height / zoom,
        ); // Height-based
        const newRenderDistanceX = Math.max(
          LAND_EXCLUSION_PADDING * 2,
          screenSize.width / zoom,
        ); // Width-based

        // Update render distance if either axis changed significantly
        if (
          Math.abs(newRenderDistanceX - currentRenderDistance.x) > 5 ||
          Math.abs(newRenderDistanceZ - currentRenderDistance.z) > 5
        ) {
          currentRenderDistance = {
            x: newRenderDistanceX,
            z: newRenderDistanceZ,
          };
        }

        // Only update if position actually changed to avoid unnecessary recalculations
        if (
          Math.abs(newX - cameraPosition.x) > 0.1 ||
          Math.abs(newZ - cameraPosition.z) > 0.1
        ) {
          cameraPosition = { x: newX, z: newZ };
        }
      }
    };

    // Wait for camera controls to be available, then add event listener
    const checkForControls = () => {
      if (gameStore.cameraControls) {
        gameStore.cameraControls.addEventListener(
          'update',
          updateCameraPosition,
        );

        // Initialize position immediately
        updateCameraPosition();
      } else {
        // Check again in a bit if controls aren't ready yet
        setTimeout(checkForControls, 100);
      }
    };

    checkForControls();

    return () => {
      if (gameStore.cameraControls) {
        gameStore.cameraControls.removeEventListener(
          'update',
          updateCameraPosition,
        );
      }
      window.removeEventListener('resize', updateScreenSize);
    };
  });

  // Animate clouds with subtle movement
  useTask((delta) => {
    time += delta * 0.1; // Very slow time progression (0.1x speed)
  });

  // Generate cloud positions only at land bounds perimeter
  let cloudPositions = $derived.by(() => {
    if (!cloudMeshSize || !bounds) {
      return [];
    }

    const positions: any[] = [];

    // Include time and cursor position in dependencies to ensure animations and mouse reactivity update
    const currentTime = time;
    const mousePos = cursorStore.absolutePosition;

    // Use cached edge positions
    const edgePositions = generateEdgePositions(bounds);

    // Only render clouds if they're within camera view
    const cameraX = cameraPosition.x;
    const cameraZ = cameraPosition.z;

    let culledCount = 0;
    let processedCount = 0;

    // Pre-calculate expensive values outside the loop
    const cloudRenderDistanceX = Math.max(currentRenderDistance.x * 2, 100);
    const cloudRenderDistanceZ = Math.max(currentRenderDistance.z * 2, 100);
    const time07 = currentTime * 0.7;
    const time05 = currentTime * 0.5;

    edgePositions.forEach(({ x, z }) => {
      const distanceX = Math.abs(x - cameraX);
      const distanceZ = Math.abs(z - cameraZ);

      // Only add if within generous render distance
      if (
        distanceX <= cloudRenderDistanceX &&
        distanceZ <= cloudRenderDistanceZ
      ) {
        processedCount++;
        const cached = getCachedRandomValues(x, z, true);

        // Add subtle movement based on time for edge clouds using cached values
        const movementX = Math.sin(currentTime + cached.timeOffset) * 0.3;
        const movementZ = Math.cos(time07 + cached.timeOffset2) * 0.2;
        const verticalBob = Math.sin(time05 + cached.timeOffset3) * 0.1;

        // Add mouse-based movement for border clouds - optimized
        let mouseInfluenceX = 0;
        let mouseInfluenceZ = 0;
        if (mousePos) {
          const mouseX = mousePos.x;
          const mouseZ = mousePos.y;
          const deltaX = x - mouseX;
          const deltaZ = z - mouseZ;

          // Use squared distance to avoid expensive sqrt calculation
          const distanceSquared = deltaX * deltaX + deltaZ * deltaZ;
          const maxDistanceSquared =
            MAX_INFLUENCE_DISTANCE * MAX_INFLUENCE_DISTANCE;

          if (distanceSquared < maxDistanceSquared) {
            // Only calculate sqrt when needed
            const distanceFromMouse = Math.sqrt(distanceSquared);
            const minDistance = 0.5;
            const adjustedDistance = Math.max(distanceFromMouse, minDistance);

            const influence = Math.max(
              0,
              1 - adjustedDistance / MAX_INFLUENCE_DISTANCE,
            );
            const invAdjustedDistance = 1 / adjustedDistance;

            // Enhanced mouse influence for better reactivity
            const mouseInfluenceStrength = 1.5; // Increase influence strength
            mouseInfluenceX =
              deltaX * invAdjustedDistance * influence * mouseInfluenceStrength;
            mouseInfluenceZ =
              deltaZ * invAdjustedDistance * influence * mouseInfluenceStrength;
          }
        }

        positions.push({
          x: x + movementX + mouseInfluenceX,
          y: z + movementZ + mouseInfluenceZ,
          z: CLOUDS_HEIGHT + cached.heightVariation + verticalBob,
          scale: cached.scale,
          rotation: cached.rotation,
          opacity: cached.opacity,
        });
      } else {
        culledCount++;
      }
    });

    // Periodically clean up cache for positions far from camera to prevent memory leaks
    // Only clean every 100th frame to avoid performance impact
    if (Math.random() < 0.01) {
      // ~1% chance per frame
      const maxCacheDistance =
        Math.max(currentRenderDistance.x, currentRenderDistance.z) * 2;
      const keysToDelete: string[] = [];

      for (const [key] of randomCache) {
        if (key.startsWith('edge-')) {
          const coords = key.substring(5).split(',');
          const keyX = parseFloat(coords[0]);
          const keyZ = parseFloat(coords[1]);
          const distance = Math.max(
            Math.abs(keyX - cameraX),
            Math.abs(keyZ - cameraZ),
          );
          if (distance > maxCacheDistance) {
            keysToDelete.push(key);
          }
        } else {
          const coords = key.split(',');
          const keyX = parseFloat(coords[0]);
          const keyZ = parseFloat(coords[1]);
          const distance = Math.max(
            Math.abs(keyX - cameraX),
            Math.abs(keyZ - cameraZ),
          );
          if (distance > maxCacheDistance) {
            keysToDelete.push(key);
          }
        }
      }

      keysToDelete.forEach((key) => randomCache.delete(key));
    }

    return positions;
  });

  // Create cloud planes that span camera view with holes for land bounds
  let cloudPlaneGeometries = $derived.by(() => {
    if (!bounds) return [];

    const cameraX = cameraPosition.x;
    const cameraZ = cameraPosition.z;
    const renderDistanceX = currentRenderDistance.x;
    const renderDistanceZ = currentRenderDistance.z;

    // Create geometry cache key based on relevant parameters including camera position
    const geometryKey = `${bounds.minX},${bounds.maxX},${bounds.minY},${bounds.maxY},${Math.round(renderDistanceX / 10) * 10},${Math.round(renderDistanceZ / 10) * 10},${Math.round(cameraX / 5) * 5},${Math.round(cameraZ / 5) * 5}`;

    if (cachedGeometryKey === geometryKey && cachedPlaneGeometries.length > 0) {
      return cachedPlaneGeometries;
    }

    // Calculate land bounds with padding
    const landMinX = bounds.minX - LAND_EXCLUSION_PADDING;
    const landMaxX = bounds.maxX + LAND_EXCLUSION_PADDING;
    const landMinZ = bounds.minY - LAND_EXCLUSION_PADDING;
    const landMaxZ = bounds.maxY + LAND_EXCLUSION_PADDING;

    // Calculate camera viewport bounds with generous margins
    const cameraMinX = cameraX - renderDistanceX * 1.5;
    const cameraMaxX = cameraX + renderDistanceX * 1.5;
    const cameraMinZ = cameraZ - renderDistanceZ * 1.5;
    const cameraMaxZ = cameraZ + renderDistanceZ * 1.5;

    // Create planes that cover the entire camera viewport, excluding land bounds
    const planes: any[] = [];
    const planePositions = [
      // North plane (above land bounds) - extends to camera bounds
      {
        x:
          (Math.min(landMinX, cameraMinX) + Math.max(landMaxX, cameraMaxX)) / 2,
        z: (landMaxZ + cameraMaxZ) / 2,
        width: Math.max(landMaxX, cameraMaxX) - Math.min(landMinX, cameraMinX),
        height: cameraMaxZ - landMaxZ,
      },
      // South plane (below land bounds) - extends to camera bounds
      {
        x:
          (Math.min(landMinX, cameraMinX) + Math.max(landMaxX, cameraMaxX)) / 2,
        z: (landMinZ + cameraMinZ) / 2,
        width: Math.max(landMaxX, cameraMaxX) - Math.min(landMinX, cameraMinX),
        height: landMinZ - cameraMinZ,
      },
      // East plane (right of land bounds) - extends to camera bounds
      {
        x: (landMaxX + cameraMaxX) / 2,
        z: cameraZ,
        width: cameraMaxX - landMaxX,
        height: cameraMaxZ - cameraMinZ,
      },
      // West plane (left of land bounds) - extends to camera bounds
      {
        x: (landMinX + cameraMinX) / 2,
        z: cameraZ,
        width: landMinX - cameraMinX,
        height: cameraMaxZ - cameraMinZ,
      },
    ];

    planePositions.forEach((plane) => {
      // Only create plane if it has positive dimensions and is needed
      if (plane.width > 0 && plane.height > 0) {
        const geometry = new PlaneGeometry(plane.width, plane.height);
        planes.push({
          geometry,
          position: { x: plane.x, y: CLOUDS_HEIGHT, z: plane.z },
          rotation: { x: 0, y: 0, z: 0 },
        });
      }
    });

    // Cache the results
    cachedPlaneGeometries = planes;
    cachedGeometryKey = geometryKey;

    return planes;
  });

  // Extract geometry and material, create instanced mesh when GLTF loads
  $effect(() => {
    if ($gltf && !cloudsInstancedMesh) {
      const cloudMesh = $gltf.nodes['Cube001']; // -> THREE.Mesh
      const cloudMaterial = $gltf.materials['Material']; // -> THREE.Material

      if (cloudMesh && cloudMesh.geometry && cloudMaterial) {
        // Calculate mesh bounding box to get size
        cloudMesh.geometry.computeBoundingBox();
        if (cloudMesh.geometry.boundingBox) {
          cloudMeshSize = cloudMesh.geometry.boundingBox.getSize(new Vector3());
        }

        cloudsInstancedMesh = new TInstancedMesh(
          cloudMesh.geometry,
          cloudMaterial,
          MAX_INSTANCES,
        );
        cloudsInstancedMesh.frustumCulled = false;
      }
    }
  });

  // Update clouds instances when positions change - using useTask for better performance
  useTask(() => {
    if (cloudsInstancedMesh && cloudPositions.length > 0) {
      const tempObject = new Object3D();

      cloudPositions.forEach((position, index) => {
        tempObject.position.set(position.x, position.z, position.y);
        tempObject.rotation.set(0, position.rotation, 0);
        tempObject.scale.set(position.scale, position.scale, position.scale);
        tempObject.updateMatrix();
        cloudsInstancedMesh!.setMatrixAt(index, tempObject.matrix);
      });

      cloudsInstancedMesh.castShadow = true;
      cloudsInstancedMesh.instanceMatrix.needsUpdate = true;
      cloudsInstancedMesh.count = cloudPositions.length;
    }
  });

  // Create cloud plane meshes - using useTask for better performance
  useTask(() => {
    if (cloudPlaneGeometries.length > 0) {
      const material = new MeshStandardMaterial({});

      cloudPlanes = cloudPlaneGeometries.map((plane) => {
        const mesh = new Mesh(plane.geometry, material);
        mesh.position.set(plane.position.x, plane.position.y, plane.position.z);
        mesh.rotation.set(
          plane.rotation.x - Math.PI / 2, // Rotate to be horizontal
          plane.rotation.y,
          plane.rotation.z,
        );
        mesh.castShadow = true; // Planes don't cast shadows
        mesh.receiveShadow = false; // Planes don't receive shadows
        return mesh;
      });
    } else {
      cloudPlanes = [];
    }
  });
</script>

<!-- Sun lighting with shadow configuration -->
<T.DirectionalLight
  position={[-25, 200, 25]}
  intensity={4.5}
  color="#110D31"
  castShadow={true}
  shadow.mapSize.width={4096 * 2}
  shadow.mapSize.height={4096 * 2}
  shadow.camera.near={0.1}
  shadow.camera.far={500}
  shadow.camera.left={-200}
  shadow.camera.right={200}
  shadow.camera.top={200}
  shadow.camera.bottom={-200}
  shadow.bias={-0.0005}
/>

<!-- Ground plane to receive shadows -->
<T.Mesh
  position={[127, 0.99, 127]}
  rotation={[-Math.PI / 2, 0, 0]}
  receiveShadow={true}
>
  <T.PlaneGeometry args={[100, 100]} />
  <T.ShadowMaterial opacity={0.1} />
</T.Mesh>

{#if cloudsInstancedMesh && cloudPositions.length > 0}
  <T is={cloudsInstancedMesh} />
{/if}

<!-- Render cloud planes -->
{#each cloudPlanes as plane}
  <T is={plane} />
{/each}
