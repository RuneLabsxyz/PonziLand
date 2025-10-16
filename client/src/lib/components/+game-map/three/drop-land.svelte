<script lang="ts">
  import { T, useTask } from '@threlte/core';
  import { onMount } from 'svelte';
  import {
    BufferGeometry,
    Float32BufferAttribute,
    PointsMaterial,
    Points,
    TextureLoader,
    AdditiveBlending,
    Color,
    ShaderMaterial,
    DoubleSide,
    PlaneGeometry,
    MeshBasicMaterial,
    InstancedMesh,
    Object3D,
    Matrix4,
  } from 'three';
  import type { LandTile } from './landTile';
  import { devsettings } from './utils/devsettings.store.svelte';
  import dropLandVertexShader from './shaders/vertex_drop_land.glsl';
  import dropLandFragmentShader from './shaders/fragment_drop_land.glsl';

  let {
    tile,
    i,
    positionOffset = [0, 0, 0],
    scale = 1,
  }: {
    tile: LandTile;
    i: number;
    positionOffset?: [number, number, number];
    scale?: number;
  } = $props();

  let dropLandPosition: [number, number, number] = $derived([
    tile.position[0] + positionOffset[0],
    tile.position[1] + 0.1, // Higher above the land
    tile.position[2] + positionOffset[2],
  ]);

  // Create sparkle particles - many tiny dots
  const PARTICLE_COUNT = 50; // More particles for shiny effect
  let geometry: PlaneGeometry | undefined = $state();
  let material: ShaderMaterial | undefined = $state();
  let instancedMesh: InstancedMesh | undefined = $state();
  let time = $state(0);
  let dummy = new Object3D();

  let particlePositions: Array<{
    x: number;
    y: number;
    z: number;
    scale: number;
  }> = [];

  onMount(() => {
    // Create a larger plane geometry for each particle
    geometry = new PlaneGeometry(0.2, 0.2); // Even bigger particles

    // Create shader material for circular particles with very soft edges
    material = new ShaderMaterial({
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
      vertexShader: dropLandVertexShader,
      fragmentShader: dropLandFragmentShader,
      uniforms: {
        opacity: { value: 0.9 },
      },
    });

    // Create instanced mesh
    instancedMesh = new InstancedMesh(geometry, material, PARTICLE_COUNT);

    // Set initial positions
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const x = (Math.random() - 0.5) * 0.8;
      const z = (Math.random() - 0.5) * 0.8;
      const y = Math.random() * 0.2;
      const scale = 1 + Math.random() * 0.5; // Larger scale

      particlePositions.push({ x, y, z, scale });

      dummy.position.set(x, y, z);
      dummy.scale.setScalar(scale);
      dummy.rotation.x = -Math.PI / 2; // Face upward
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, dummy.matrix);
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
  });

  // Animate sparkles
  useTask((delta) => {
    if (!devsettings.enableAnimations) return;

    time += delta;

    if (instancedMesh && material) {
      for (let j = 0; j < PARTICLE_COUNT; j++) {
        const particle = particlePositions[j];

        // Add subtle movement
        const shimmerX = Math.sin(time * 3 + j * 0.5) * 0.01;
        const shimmerZ = Math.cos(time * 2 + j * 0.7) * 0.01;
        const shimmerY = Math.abs(Math.sin(time * 4 + j)) * 0.02;

        dummy.position.set(
          particle.x + shimmerX,
          particle.y + shimmerY,
          particle.z + shimmerZ,
        );
        dummy.scale.setScalar(particle.scale);
        dummy.rotation.x = -Math.PI / 2; // Keep rotation
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(j, dummy.matrix);
      }

      // Twinkle effect by varying opacity
      if (material instanceof ShaderMaterial) {
        material.uniforms.opacity.value = 0.6 + Math.sin(time * 2) * 0.2;
      }

      instancedMesh.instanceMatrix.needsUpdate = true;
    }
  });
</script>

{#if instancedMesh}
  <T.Group position={dropLandPosition}>
    <T is={instancedMesh} />
  </T.Group>
{/if}
