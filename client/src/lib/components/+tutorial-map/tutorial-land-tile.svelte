<script lang="ts">
  import { T } from '@threlte/core';
  import {
    tutorialLandStore,
    type TutorialLand,
  } from '$lib/stores/tutorial-land.store.svelte';
  import { tutorialStore } from '$lib/stores/tutorial.store.svelte';
  import * as THREE from 'three';

  let { land }: { land: TutorialLand } = $props();

  // Derive color based on land type and ownership
  let color = $derived(() => {
    if (land.isHighlighted) return '#ffff00'; // Yellow for highlighted

    switch (land.type) {
      case 'empty':
        return '#666666'; // Gray for empty
      case 'auction':
        return '#9b59b6'; // Purple for auction
      case 'building':
        // Color based on token used
        if (land.tokenUsed === 'ETH') return '#627eea';
        if (land.tokenUsed === 'LORDS') return '#ff6b00';
        return '#3498db'; // Default blue
    }
  });

  // Building height based on level
  let buildingHeight = $derived(
    land.type === 'building' ? land.level * 0.5 : 0.1,
  );

  // Handle click
  function handleClick(event: CustomEvent) {
    event.detail.event.stopPropagation();

    if (!tutorialStore.isActionAllowed('select-land')) return;

    tutorialLandStore.selectLand(land.x, land.y);

    // Progress tutorial if appropriate
    const currentStep = tutorialStore.currentStep;
    if (currentStep?.id === 'select-land' && land.type === 'empty') {
      tutorialStore.nextStep();
    } else if (currentStep?.id === 'auction' && land.type === 'auction') {
      tutorialStore.nextStep();
    }
  }

  // Create materials
  const baseMaterial = new THREE.MeshStandardMaterial({ color: color() });
  const hoverMaterial = new THREE.MeshStandardMaterial({
    color: color(),
    emissive: new THREE.Color(color()),
    emissiveIntensity: 0.2,
  });

  let isHovered = $state(false);
  let currentMaterial = $derived(isHovered ? hoverMaterial : baseMaterial);

  // Update material color when it changes
  $effect(() => {
    const newColor = color();
    baseMaterial.color.set(newColor);
    hoverMaterial.color.set(newColor);
    hoverMaterial.emissive.set(newColor);
  });
</script>

<!-- Land base -->
<T.Mesh
  position={[land.x, 0.05, land.y]}
  material={currentMaterial}
  onpointerenter={() => (isHovered = true)}
  onpointerleave={() => (isHovered = false)}
  onpointerdown={handleClick}
  castShadow
  receiveShadow
>
  <T.BoxGeometry args={[0.9, 0.1, 0.9]} />
</T.Mesh>

<!-- Building (if owned) -->
{#if land.type === 'building'}
  <T.Mesh
    position={[land.x, buildingHeight / 2 + 0.1, land.y]}
    material={currentMaterial}
    castShadow
  >
    <T.BoxGeometry args={[0.7, buildingHeight, 0.7]} />
  </T.Mesh>
{/if}

<!-- Auction indicator -->
{#if land.type === 'auction'}
  <T.Mesh position={[land.x, 1, land.y]}>
    <T.ConeGeometry args={[0.3, 0.6, 8]} />
    <T.MeshStandardMaterial
      color="#9b59b6"
      emissive="#9b59b6"
      emissiveIntensity={0.5}
    />
  </T.Mesh>
{/if}

<!-- Selection indicator -->
{#if tutorialLandStore.selectedLand?.location === land.location}
  <T.Mesh position={[land.x, 0.15, land.y]}>
    <T.RingGeometry args={[0.3, 0.4, 32]} />
    <T.MeshBasicMaterial color="#ffffff" opacity={0.8} transparent />
  </T.Mesh>
{/if}
