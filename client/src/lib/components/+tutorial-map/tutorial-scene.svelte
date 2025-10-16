<script lang="ts">
  import { T, useTask } from '@threlte/core';
  import { Interactivity } from '@threlte/extras';
  import { tutorialLandStore } from '$lib/stores/tutorial-land.store.svelte';
  import { tutorialStore } from '$lib/stores/tutorial.store.svelte';
  import TutorialLandTile from './tutorial-land-tile.svelte';
  import * as THREE from 'three';

  // Get all lands
  let lands = $derived(tutorialLandStore.getAllLands());

  // Handle click on ground
  function handleGroundClick(event: CustomEvent) {
    const { point } = event.detail;
    const x = Math.floor(point.x + 0.5);
    const y = Math.floor(point.z + 0.5);

    // Check if clicking on land is allowed
    if (!tutorialStore.isActionAllowed('select-land')) return;

    // Select land if it exists
    const land = tutorialLandStore.getLand(x, y);
    if (land) {
      tutorialLandStore.selectLand(x, y);

      // Progress tutorial if needed
      if (
        tutorialStore.currentStep?.id === 'select-land' &&
        land.type === 'empty'
      ) {
        tutorialStore.nextStep();
      }
    }
  }

  // Create a large invisible plane for ground clicks
  const planeGeometry = new THREE.PlaneGeometry(256, 256);
  const planeMaterial = new THREE.MeshBasicMaterial({
    visible: false,
    side: THREE.DoubleSide,
  });
</script>

<Interactivity>
  <!-- Invisible ground plane for clicks -->
  <T.Mesh
    geometry={planeGeometry}
    material={planeMaterial}
    rotation.x={-Math.PI / 2}
    position.x={128}
    position.z={128}
    position.y={0}
    onpointerdown={handleGroundClick}
  />

  <!-- Render all tutorial lands -->
  {#each lands as land (land.location)}
    <TutorialLandTile {land} />
  {/each}

  <!-- Tutorial highlights/effects -->
  {#if tutorialStore.currentStep?.targetElement === 'empty-land'}
    <!-- Highlight empty lands -->
    {#each lands.filter((l) => l.type === 'empty') as land}
      <T.Mesh position={[land.x, 0.1, land.y]}>
        <T.RingGeometry args={[0.4, 0.5, 32]} />
        <T.MeshBasicMaterial color="#00ff00" opacity={0.5} transparent />
      </T.Mesh>
    {/each}
  {/if}

  {#if tutorialStore.currentStep?.targetElement === 'auction-land'}
    <!-- Highlight auction land -->
    {#each lands.filter((l) => l.type === 'auction') as land}
      <T.Mesh position={[land.x, 0.1, land.y]}>
        <T.RingGeometry args={[0.4, 0.5, 32]} />
        <T.MeshBasicMaterial color="#ff00ff" opacity={0.5} transparent />
      </T.Mesh>
    {/each}
  {/if}
</Interactivity>
