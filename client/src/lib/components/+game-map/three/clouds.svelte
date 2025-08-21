<script lang="ts">
  import { T } from '@threlte/core';
  import { useGltf } from '@threlte/extras';
  import { Object3D, InstancedMesh as TInstancedMesh, Vector3 } from 'three';
  import type * as THREE from 'three';

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

  // Calculate cloud positions at the bounds with offset
  let cloudPositions = $derived.by(() => {
    if (!bounds || !cloudMeshSize) return [];
    
    // Calculate offsets based on mesh size
    const offsetX = cloudMeshSize.x / 2;
    const offsetZ = cloudMeshSize.z / 2;
    
    // Calculate center points for edges
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    
    const positions = [
      // Corner clouds
      // Top-left corner (offset outward)
      { x: bounds.minX - offsetX, y: bounds.minY - offsetZ },
      // Top-right corner (offset outward)
      { x: bounds.maxX + offsetX, y: bounds.minY - offsetZ },
      // Bottom-left corner (offset outward)
      { x: bounds.minX - offsetX, y: bounds.maxY + offsetZ },
      // Bottom-right corner (offset outward)
      { x: bounds.maxX + offsetX, y: bounds.maxY + offsetZ },
      
      // Edge middle clouds
      // Top edge middle
      { x: centerX, y: bounds.minY - offsetZ },
      // Right edge middle
      { x: bounds.maxX + offsetX, y: centerY },
      // Bottom edge middle
      { x: centerX, y: bounds.maxY + offsetZ },
      // Left edge middle
      { x: bounds.minX - offsetX, y: centerY },
    ];
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
          8,
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
