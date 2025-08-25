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

  const CLOUDS_HEIGHT = 8; // Position clouds above the grid

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

  // Set up camera controls update event listener
  onMount(() => {
    console.log('🌥️ Clouds: Setting up camera controls update listener');
    
    const updateCameraPosition = () => {
      if (gameStore.cameraControls?.camera) {
        const cam = gameStore.cameraControls.camera;
        const newX = cam.position.x;
        const newZ = cam.position.z;
        
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
    };
  });

  // Calculate cloud positions relative to camera position
  let cloudPositions = $derived.by(() => {
    if (!cloudMeshSize) {
      console.log('🌥️ Clouds: Missing cloudMeshSize');
      return [];
    }
    
    console.log('🌥️ Clouds: Calculating positions for camera at:', cameraPosition.x.toFixed(1), cameraPosition.z.toFixed(1));
    
    // Get camera position from reactive state
    const cameraX = cameraPosition.x;
    const cameraZ = cameraPosition.z;
    
    // Simple offset pattern around camera (8 clouds in a square around camera)
    const offset = 20; // Distance from camera
    
    const positions = [
      // Corner clouds around camera
      { x: cameraX - offset, y: cameraZ - offset }, // Top-left
      { x: cameraX + offset, y: cameraZ - offset }, // Top-right  
      { x: cameraX - offset, y: cameraZ + offset }, // Bottom-left
      { x: cameraX + offset, y: cameraZ + offset }, // Bottom-right
      
      // Edge middle clouds
      { x: cameraX, y: cameraZ - offset }, // Top middle
      { x: cameraX + offset, y: cameraZ }, // Right middle
      { x: cameraX, y: cameraZ + offset }, // Bottom middle
      { x: cameraX - offset, y: cameraZ }, // Left middle
    ];
    
    console.log('🌥️ Clouds: Generated', positions.length, 'positions around camera');
    return positions;
  });

  // Extract geometry and material, create instanced mesh when GLTF loads
  $effect(() => {
    if ($gltf && !cloudsInstancedMesh) {
      console.log('Creating clouds instanced mesh', $gltf.nodes);
      const cloudMesh = $gltf.nodes['Cube001']; // -> THREE.Mesh
      const cloudMaterial = $gltf.materials['Material']; // -> THREE.Material

      console.log('Cloud mesh and material loaded:', cloudMesh, cloudMaterial);
      if (cloudMesh && cloudMesh.geometry && cloudMaterial) {
        // Calculate mesh bounding box to get size
        cloudMesh.geometry.computeBoundingBox();
        if (cloudMesh.geometry.boundingBox) {
          cloudMeshSize = cloudMesh.geometry.boundingBox.getSize(new Vector3());
        }
        console.log('Cloud mesh size:', cloudMeshSize);
        
        // Create instanced mesh with up to 8 instances (for bounds corners + edge middles)
        cloudsInstancedMesh = new TInstancedMesh(
          cloudMesh.geometry,
          cloudMaterial,
          100,
        );
      }
    }
  });

  // Update clouds instances when positions change
  $effect(() => {
    if (cloudsInstancedMesh && cloudPositions.length > 0) {
      console.log('Updating clouds instanced mesh');
      const tempObject = new Object3D();

      cloudPositions.forEach((position, index) => {
        tempObject.position.set(position.x, CLOUDS_HEIGHT, position.y);
        tempObject.rotation.set(0, 0, 0);
        tempObject.scale.set(1, 1, 1);
        tempObject.updateMatrix();
        cloudsInstancedMesh!.setMatrixAt(index, tempObject.matrix);
        console.log(
          `Set cloud instance ${index} at position (${position.x}, ${CLOUDS_HEIGHT}, ${position.y})`,
        );
      });

      cloudsInstancedMesh.instanceMatrix.needsUpdate = true;
      cloudsInstancedMesh.count = cloudPositions.length;
    }
  });
</script>

{#if cloudsInstancedMesh && cloudPositions.length > 0}
  <T is={cloudsInstancedMesh} />
{/if}
