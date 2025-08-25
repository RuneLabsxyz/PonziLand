<script lang="ts">
  import { T } from '@threlte/core';
  import { useGltf } from '@threlte/extras';
  import { Object3D, InstancedMesh as TInstancedMesh, Vector3 } from 'three';
  import type * as THREE from 'three';
  import { gameStore } from './game.store.svelte';
  import { onMount } from 'svelte';

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
  const CLOUD_SPACING = 10; // Distance between clouds in grid
  const LAND_EXCLUSION_PADDING = 10; // Extra padding around land bounds
  const CLOUD_POSITION_OFFSET = 0; // Offset for cloud positioning

  // Load clouds GLB using useGltf hook with proper typing
  const gltf = useGltf<{
    nodes: {
      'Cube001': THREE.Mesh;
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
    console.log('🌥️ Clouds: Setting up camera controls update listener');
    console.log('🌥️ Clouds: Initial bounds:', bounds);
    
    // Initialize screen size
    const updateScreenSize = () => {
      screenSize = {
        width: window.innerWidth,
        height: window.innerHeight
      };
      console.log('🌥️ Clouds: Screen size updated to:', screenSize);
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
        const newRenderDistanceZ = Math.max(10, (screenSize.height / zoom)); // Height-based
        const newRenderDistanceX = Math.max(10, (screenSize.width / zoom)); // Width-based
        
        console.log('🌥️ Clouds: Camera zoom:', zoom, 'screen:', `${screenSize.width}x${screenSize.height}`);
        console.log('🌥️ Clouds: Render distances - X (height):', newRenderDistanceX.toFixed(1), 'Z (width):', newRenderDistanceZ.toFixed(1));
        
        // Update render distance if either axis changed significantly
        if (Math.abs(newRenderDistanceX - currentRenderDistance.x) > 5 || 
            Math.abs(newRenderDistanceZ - currentRenderDistance.z) > 5) {
          console.log('🌥️ Clouds: Render distances updated from', 
                     `X:${currentRenderDistance.x.toFixed(1)} Z:${currentRenderDistance.z.toFixed(1)}`, 
                     'to', 
                     `X:${newRenderDistanceX.toFixed(1)} Z:${newRenderDistanceZ.toFixed(1)}`);
          currentRenderDistance = { x: newRenderDistanceX, z: newRenderDistanceZ };
        }
        
        // Only update if position actually changed to avoid unnecessary recalculations
        if (Math.abs(newX - cameraPosition.x) > 0.1 || Math.abs(newZ - cameraPosition.z) > 0.1) {
          console.log('🌥️ Clouds: Camera updated to:', newX.toFixed(1), newZ.toFixed(1));
          cameraPosition = { x: newX, z: newZ };
        }
      }
    };
    
    // Wait for camera controls to be available, then add event listener
    const checkForControls = () => {
      if (gameStore.cameraControls) {
        console.log('🌥️ Clouds: Camera controls found, adding update listener');
        gameStore.cameraControls.addEventListener('update', updateCameraPosition);
        
        // Initialize position immediately
        updateCameraPosition();
      } else {
        console.log('🌥️ Clouds: Camera controls not ready, retrying...');
        // Check again in a bit if controls aren't ready yet
        setTimeout(checkForControls, 100);
      }
    };
    
    checkForControls();
    
    return () => {
      if (gameStore.cameraControls) {
        console.log('🌥️ Clouds: Removing camera controls update listener');
        gameStore.cameraControls.removeEventListener('update', updateCameraPosition);
      }
      window.removeEventListener('resize', updateScreenSize);
    };
  });

  // Generate dense cloud grid around camera, excluding land bounds
  let cloudPositions = $derived.by(() => {
    console.log('🌥️ Clouds: Starting cloud position calculation');
    console.log('🌥️ Clouds: cloudMeshSize:', cloudMeshSize);
    console.log('🌥️ Clouds: cameraPosition:', cameraPosition);
    console.log('🌥️ Clouds: bounds:', bounds);
    
    if (!cloudMeshSize) {
      console.log('🌥️ Clouds: Missing cloudMeshSize, returning empty array');
      return [];
    }
    
    console.log('🌥️ Clouds: Calculating dense grid for camera at:', cameraPosition.x.toFixed(1), cameraPosition.z.toFixed(1));
    
    const cameraX = cameraPosition.x;
    const cameraZ = cameraPosition.z;
    const positions = [];
    
    // Calculate grid bounds around camera using asymmetric render distances
    // X axis uses height-based distance, Z axis uses width-based distance
    const startX = Math.floor((cameraX - currentRenderDistance.x) / CLOUD_SPACING) * CLOUD_SPACING;
    const endX = Math.floor((cameraX + currentRenderDistance.x) / CLOUD_SPACING) * CLOUD_SPACING;
    const startZ = Math.floor((cameraZ - currentRenderDistance.z) / CLOUD_SPACING) * CLOUD_SPACING;
    const endZ = Math.floor((cameraZ + currentRenderDistance.z) / CLOUD_SPACING) * CLOUD_SPACING;
    
    console.log('🌥️ Clouds: Grid bounds - X:', startX, 'to', endX, 'Z:', startZ, 'to', endZ);
    
    // Define land exclusion area
    let landMinX: number | undefined, landMaxX: number | undefined, landMinZ: number | undefined, landMaxZ: number | undefined;
    if (bounds) {
      landMinX = bounds.minX - LAND_EXCLUSION_PADDING;
      landMaxX = bounds.maxX + LAND_EXCLUSION_PADDING;
      landMinZ = bounds.minY - LAND_EXCLUSION_PADDING;
      landMaxZ = bounds.maxY + LAND_EXCLUSION_PADDING;
      console.log('🌥️ Clouds: Land exclusion area:', { landMinX, landMaxX, landMinZ, landMaxZ });
    } else {
      console.log('🌥️ Clouds: No bounds provided, generating clouds everywhere');
    }
    
    let skippedCount = 0;
    let generatedCount = 0;
    
    // Generate grid of clouds
    for (let x = startX; x <= endX; x += CLOUD_SPACING) {
      for (let z = startZ; z <= endZ; z += CLOUD_SPACING) {
        // Skip if within land bounds
        if (bounds && landMinX !== undefined && landMaxX !== undefined && 
            landMinZ !== undefined && landMaxZ !== undefined &&
            x >= landMinX && x <= landMaxX && 
            z >= landMinZ && z <= landMaxZ) {
          skippedCount++;
          continue; // Skip this position - it's in the land area
        }
        
        // Add some randomness to positions for natural look
        // const offsetX = (Math.random() - 0.5) * CLOUD_SPACING * 0.6;
        // const offsetZ = (Math.random() - 0.5) * CLOUD_SPACING * 0.6;

        const randomOffsetX = 0;
        const randomOffsetZ = 0;

        const positionOffsetX = CLOUD_POSITION_OFFSET;
        const positionOffsetZ = CLOUD_POSITION_OFFSET;

        positions.push({
          x: x + randomOffsetX + positionOffsetX,
          y: z + randomOffsetZ + positionOffsetZ,
          scale: 0.7 + Math.random() * 0.6, // Random scale 0.7 - 1.3
          rotation: Math.random() * Math.PI * 2
        });
        generatedCount++;
      }
    }
    
    console.log('🌥️ Clouds: Generated', generatedCount, 'clouds, skipped', skippedCount, 'in land area');
    console.log('🌥️ Clouds: First few positions:', positions.slice(0, 3));
    return positions;
  });

  // Extract geometry and material, create instanced mesh when GLTF loads
  $effect(() => {
    console.log('🌥️ Clouds: GLTF effect running - gltf:', !!$gltf, 'cloudsInstancedMesh:', !!cloudsInstancedMesh);
    if ($gltf && !cloudsInstancedMesh) {
      console.log('🌥️ Clouds: Creating instanced mesh, GLTF nodes:', $gltf.nodes);
      const cloudMesh = $gltf.nodes['Cube001']; // -> THREE.Mesh
      const cloudMaterial = $gltf.materials['Material']; // -> THREE.Material

      console.log('🌥️ Clouds: Cloud mesh and material loaded:', cloudMesh, cloudMaterial);
      if (cloudMesh && cloudMesh.geometry && cloudMaterial) {
        // Calculate mesh bounding box to get size
        cloudMesh.geometry.computeBoundingBox();
        if (cloudMesh.geometry.boundingBox) {
          cloudMeshSize = cloudMesh.geometry.boundingBox.getSize(new Vector3());
        }
        console.log('🌥️ Clouds: Cloud mesh size:', cloudMeshSize);
        
        // Create instanced mesh for dense cloud coverage - use a generous maximum
        // Calculate based on typical screen size and zoom range
        const maxInstances = 20000; // Fixed high limit for all scenarios
        console.log('🌥️ Clouds: Creating mesh with max instances:', maxInstances);
        cloudsInstancedMesh = new TInstancedMesh(
          cloudMesh.geometry,
          cloudMaterial,
          20000,
        );
        cloudsInstancedMesh.frustumCulled = false;
        console.log('🌥️ Clouds: Instanced mesh created successfully:', !!cloudsInstancedMesh);
      } else {
        console.error('🌥️ Clouds: Failed to load cloud mesh or material');
      }
    }
  });

  // Update clouds instances when positions change
  $effect(() => {
    console.log('🌥️ Clouds: Update effect running - mesh:', !!cloudsInstancedMesh, 'positions:', cloudPositions.length);
    if (cloudsInstancedMesh && cloudPositions.length > 0) {
      console.log('🌥️ Clouds: Updating mesh with', cloudPositions.length, 'cloud instances');
      console.log('🌥️ Clouds: Sample positions:', cloudPositions.slice(0, 2));
      const tempObject = new Object3D();

      cloudPositions.forEach((position, index) => {
        tempObject.position.set(position.x, CLOUDS_HEIGHT, position.y);
        // tempObject.rotation.set(0, position.rotation, 0);
        // tempObject.scale.set(position.scale, position.scale, position.scale);
        tempObject.updateMatrix();
        cloudsInstancedMesh!.setMatrixAt(index, tempObject.matrix);
        
        if (index < 3) {
          console.log(`🌥️ Clouds: Set instance ${index} at (${position.x.toFixed(1)}, ${CLOUDS_HEIGHT}, ${position.y.toFixed(1)}) scale: ${position.scale.toFixed(2)}`);
        }
      });

      cloudsInstancedMesh.instanceMatrix.needsUpdate = true;
      cloudsInstancedMesh.count = cloudPositions.length;
      console.log('🌥️ Clouds: Mesh updated successfully, count:', cloudsInstancedMesh.count);
    } else if (cloudsInstancedMesh && cloudPositions.length === 0) {
      console.log('🌥️ Clouds: No cloud positions to render');
    } else if (!cloudsInstancedMesh) {
      console.log('🌥️ Clouds: No instanced mesh available yet');
    }
  });
</script>

<!-- Sun lighting -->
<T.DirectionalLight 
  position={[100, 150, 50]}
  intensity={1.2}
  color="#ffffff"
  castShadow={true}
/>

<!-- Ambient light for overall scene illumination -->
<T.AmbientLight 
  intensity={0.3}
  color="#87CEEB"
/>

<!-- Additional fill light from opposite direction -->
<T.DirectionalLight 
  position={[-50, 80, -30]}
  intensity={0.4}
  color="#FFE4B5"
/>

{#if cloudsInstancedMesh && cloudPositions.length > 0}
  <T is={cloudsInstancedMesh} />
  {console.log('🌥️ Clouds: Rendering component with', cloudPositions.length, 'clouds')}
{:else}
  {console.log('🌥️ Clouds: Not rendering - mesh:', !!cloudsInstancedMesh, 'positions:', cloudPositions.length)}
{/if}
