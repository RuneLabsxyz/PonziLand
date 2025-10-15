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
  } from 'three';
  import type { LandTile } from './landTile';
  import { devsettings } from './utils/devsettings.store.svelte';

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
    tile.position[1] + 0.02, // Just slightly above the land
    tile.position[2] + positionOffset[2],
  ]);

  // Create sparkle particles - many tiny dots
  const PARTICLE_COUNT = 50; // More particles for shiny effect
  let geometry: BufferGeometry | undefined = $state();
  let material: PointsMaterial | undefined = $state();
  let pointsRef: Points | undefined = $state();
  let time = $state(0);

  onMount(() => {
    // Create geometry with random positions around the tile
    geometry = new BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const scales = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Random position across the tile surface
      const x = (Math.random() - 0.5) * 0.8; // Spread across tile
      const z = (Math.random() - 0.5) * 0.8;
      const y = Math.random() * 0.1; // Small height variation

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      scales[i] = Math.random(); // Random scale for variety
    }

    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('scale', new Float32BufferAttribute(scales, 1));

    // Create simple yellow dot material (no texture needed)
    material = new PointsMaterial({
      size: 3, // Tiny dots
      color: new Color(0xffeb3b), // Bright yellow
      transparent: true,
      opacity: 0.8,
      blending: AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: false, // Keep dots same size regardless of distance
    });
  });

  // Animate sparkles
  useTask((delta) => {
    if (!devsettings.enableAnimations) return;

    time += delta;

    if (geometry && material) {
      // Update positions for subtle shimmer effect
      const positions = geometry.attributes.position.array as Float32Array;
      const scales = geometry.attributes.scale.array as Float32Array;

      for (let j = 0; j < PARTICLE_COUNT; j++) {
        // Original position stored in scales array (x, z components)
        const baseX = (scales[j] - 0.5) * 0.8;
        const baseZ = (j / PARTICLE_COUNT - 0.5) * 0.8;

        // Add subtle movement
        const shimmerX = Math.sin(time * 3 + j * 0.5) * 0.01;
        const shimmerZ = Math.cos(time * 2 + j * 0.7) * 0.01;
        const shimmerY = Math.abs(Math.sin(time * 4 + j)) * 0.02;

        positions[j * 3] = baseX + shimmerX;
        positions[j * 3 + 1] = shimmerY;
        positions[j * 3 + 2] = baseZ + shimmerZ;
      }

      // Twinkle effect by varying opacity
      material.opacity = 0.6 + Math.sin(time * 2) * 0.2;

      geometry.attributes.position.needsUpdate = true;
    }
  });
</script>

{#if geometry && material}
  <T.Group position={dropLandPosition}>
    <T.Points bind:ref={pointsRef}>
      <T is={geometry} />
      <T is={material} />
    </T.Points>
  </T.Group>
{/if}
