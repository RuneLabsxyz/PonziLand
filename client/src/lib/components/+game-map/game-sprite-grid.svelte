<!-- SpriteGrid.svelte -->
<script>
  import { T } from '@threlte/core';
  import { onMount } from 'svelte';
  import * as THREE from 'three';
  import GridCell from './grid-cell.svelte';

  const GRID_SIZE = 64;
  const SPRITE_SPACING = 1;

  // Create reactive state for textures
  let roadTexture = $state();
  let biomeTexture = $state();
  let buildingTexture = $state();

  // Animation state using performance.now() for smooth timing
  let time = $state(0);
  let animationId = $state();

  onMount(() => {
    // Create simple colored textures as placeholders
    roadTexture = createColorTexture('#444444'); // Dark gray for roads
    biomeTexture = createColorTexture('#228B22'); // Green for biomes
    buildingTexture = createColorTexture('#8B4513'); // Brown for buildings
    // Start animation loop
    // startAnimationLoop();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  });

  function startAnimationLoop() {
    const startTime = performance.now();

    function animate() {
      time = (performance.now() - startTime) / 1000; // Convert to seconds
      animationId = requestAnimationFrame(animate);
    }

    animate();
  }

  function createColorTexture(color) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 64, 64);

    // Add some simple pattern
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        if ((i + j) % 2 === 0) {
          ctx.fillRect(i * 8, j * 8, 8, 8);
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
  }

  // Generate grid data
  function generateGridData() {
    const gridData = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let z = 0; z < GRID_SIZE; z++) {
        // Random data for demonstration
        const hasRoad = Math.random() > 0.7;
        const biomeType = Math.floor(Math.random() * 3); // 3 biome types
        const hasBuilding = Math.random() > 0.8;

        gridData.push({
          x,
          z,
          hasRoad,
          biomeType,
          hasBuilding,
          animationOffset: Math.random() * Math.PI * 2,
        });
      }
    }
    return gridData;
  }

  const gridData = generateGridData();
</script>

{#if roadTexture && biomeTexture && buildingTexture}
  <T.Group
    position={[
      -(GRID_SIZE * SPRITE_SPACING) / 2,
      0,
      -(GRID_SIZE * SPRITE_SPACING) / 2,
    ]}
  >
    {#each gridData as cell (cell.x + '-' + cell.z)}
      <GridCell
        x={cell.x * SPRITE_SPACING}
        z={cell.z * SPRITE_SPACING}
        hasRoad={cell.hasRoad}
        biomeType={cell.biomeType}
        hasBuilding={cell.hasBuilding}
        {roadTexture}
        {biomeTexture}
        {buildingTexture}
        {time}
        animationOffset={cell.animationOffset}
      />
    {/each}
  </T.Group>
{/if}
