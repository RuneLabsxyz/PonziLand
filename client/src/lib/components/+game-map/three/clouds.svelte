<script lang="ts">
  import { T } from '@threlte/core';
  import { useGltf } from '@threlte/extras';
  import {
    Object3D,
    InstancedMesh as TInstancedMesh,
    Vector3,
    PlaneGeometry,
    MeshLambertMaterial,
  } from 'three';
  import type * as THREE from 'three';
  import { gameStore } from './game.store.svelte';
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

  // Generate dense cloud grid around camera, excluding land bounds
  let cloudPositions = $derived.by(() => {
    if (!cloudMeshSize) {
      return [];
    }

    const cameraX = cameraPosition.x;
    const cameraZ = cameraPosition.z;
    const positions = [];

    // Calculate grid bounds around camera using asymmetric render distances
    // X axis uses height-based distance, Z axis uses width-based distance
    const startX =
      Math.floor((cameraX - currentRenderDistance.x) / CLOUD_SPACING) *
      CLOUD_SPACING;
    const endX =
      Math.floor((cameraX + currentRenderDistance.x) / CLOUD_SPACING) *
      CLOUD_SPACING;
    const startZ =
      Math.floor((cameraZ - currentRenderDistance.z) / CLOUD_SPACING) *
      CLOUD_SPACING;
    const endZ =
      Math.floor((cameraZ + currentRenderDistance.z) / CLOUD_SPACING) *
      CLOUD_SPACING;

    // Define land exclusion area
    let landMinX: number | undefined,
      landMaxX: number | undefined,
      landMinZ: number | undefined,
      landMaxZ: number | undefined;
    if (bounds) {
      landMinX = bounds.minX - LAND_EXCLUSION_PADDING;
      landMaxX = bounds.maxX + LAND_EXCLUSION_PADDING;
      landMinZ = bounds.minY - LAND_EXCLUSION_PADDING;
      landMaxZ = bounds.maxY + LAND_EXCLUSION_PADDING;
    }

    let skippedCount = 0;
    let generatedCount = 0;

    // Generate grid of clouds with density variations
    for (let x = startX; x <= endX; x += CLOUD_SPACING) {
      for (let z = startZ; z <= endZ; z += CLOUD_SPACING) {
        // Skip if within land bounds
        if (
          bounds &&
          landMinX !== undefined &&
          landMaxX !== undefined &&
          landMinZ !== undefined &&
          landMaxZ !== undefined &&
          x >= landMinX &&
          x <= landMaxX &&
          z >= landMinZ &&
          z <= landMaxZ
        ) {
          skippedCount++;
          continue; // Skip this position - it's in the land area
        }

        // Create deterministic random generator based on position
        const rng = seedrandom(`${x},${z}`);

        const offsetX = (rng() - 0.5) * CLOUD_SPACING * 0.8;
        const offsetZ = (rng() - 0.5) * CLOUD_SPACING * 0.8;

        const randomOffsetX = offsetX;
        const randomOffsetZ = offsetZ;

        const positionOffsetX = CLOUD_POSITION_OFFSET;
        const positionOffsetZ = CLOUD_POSITION_OFFSET;

        positions.push({
          x: x + randomOffsetX + positionOffsetX,
          y: z + randomOffsetZ + positionOffsetZ,
          z: CLOUDS_HEIGHT + (rng() - 0.5) * 3, // Height variation ±1.5 units
          scale: 0.8 + rng() * 0.4, // Scale variation 0.8 - 1.2
          rotation: Math.floor(rng() * 4) * (Math.PI / 2), // 0°, 90°, 180°, or 270°
          opacity: 0.7 + rng() * 0.3, // Opacity variation 0.7 - 1.0
        });
        generatedCount++;
      }
    }

    // Add edge clouds right at the land bounds perimeter with padding
    if (bounds) {
      const paddedMinX = bounds.minX - LAND_EXCLUSION_PADDING;
      const paddedMaxX = bounds.maxX + LAND_EXCLUSION_PADDING;
      const paddedMinZ = bounds.minY - LAND_EXCLUSION_PADDING;
      const paddedMaxZ = bounds.maxY + LAND_EXCLUSION_PADDING;

      const edgePositions = [
        // Top edge
        ...Array.from(
          { length: Math.ceil((paddedMaxX - paddedMinX) / CLOUD_SPACING) + 1 },
          (_, i) => ({
            x: paddedMinX + i * CLOUD_SPACING,
            z: paddedMinZ,
          }),
        ),
        // Bottom edge
        ...Array.from(
          { length: Math.ceil((paddedMaxX - paddedMinX) / CLOUD_SPACING) + 1 },
          (_, i) => ({
            x: paddedMinX + i * CLOUD_SPACING,
            z: paddedMaxZ,
          }),
        ),
        // Left edge (excluding corners already covered)
        ...Array.from(
          { length: Math.ceil((paddedMaxZ - paddedMinZ) / CLOUD_SPACING) - 1 },
          (_, i) => ({
            x: paddedMinX,
            z: paddedMinZ + (i + 1) * CLOUD_SPACING,
          }),
        ),
        // Right edge (excluding corners already covered)
        ...Array.from(
          { length: Math.ceil((paddedMaxZ - paddedMinZ) / CLOUD_SPACING) - 1 },
          (_, i) => ({
            x: paddedMaxX,
            z: paddedMinZ + (i + 1) * CLOUD_SPACING,
          }),
        ),
      ];

      edgePositions.forEach(({ x, z }) => {
        // Only add if within render distance
        if (
          Math.abs(x - cameraPosition.x) <= currentRenderDistance.x &&
          Math.abs(z - cameraPosition.z) <= currentRenderDistance.z
        ) {
          const rng = seedrandom(`edge-${x},${z}`);

          positions.push({
            x: x,
            y: z,
            z: CLOUDS_HEIGHT + (rng() - 0.5) * 3,
            scale: 0.8 + rng() * 0.4,
            rotation: Math.floor(rng() * 4) * (Math.PI / 2),
            opacity: 0.7 + rng() * 0.3,
          });
        }
      });
    }

    return positions;
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

  // Update clouds instances when positions change
  $effect(() => {
    if (cloudsInstancedMesh && cloudPositions.length > 0) {
      const tempObject = new Object3D();

      cloudPositions.forEach((position, index) => {
        tempObject.position.set(position.x, position.z, position.y);
        tempObject.rotation.set(0, position.rotation, 0);
        tempObject.scale.set(position.scale, position.scale, position.scale);
        tempObject.castShadow = true;
        tempObject.updateMatrix();
        cloudsInstancedMesh!.setMatrixAt(index, tempObject.matrix);
      });

      cloudsInstancedMesh.castShadow = true;
      cloudsInstancedMesh.instanceMatrix.needsUpdate = true;
      cloudsInstancedMesh.count = cloudPositions.length;
      // Enable shadow casting for clouds
    }
  });
</script>

<!-- Sun lighting with shadow configuration -->
<T.DirectionalLight
  position={[-25, 200, 25]}
  intensity={4.5}
  color="#ffffff"
  castShadow={true}
  shadow.mapSize.width={4096*2}
  shadow.mapSize.height={4096*2}
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
  <T.MeshStandardMaterial
    color="#ffffff"
    transparent={true}
    opacity={0.1}
    alphaTest={0.099}
  />
</T.Mesh>

<!-- Test cube to verify shadows -->
<!-- <T.Mesh position={[127, 5, 127]} castShadow={true}>
  <T.BoxGeometry args={[3, 3, 3]} />
  <T.MeshStandardMaterial color="#ff0000" />
</T.Mesh> -->

{#if cloudsInstancedMesh && cloudPositions.length > 0}
  <T is={cloudsInstancedMesh} />
{/if}
