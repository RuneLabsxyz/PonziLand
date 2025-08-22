<script lang="ts">
  import { landStore } from '$lib/stores/store.svelte';
  import type { LandTileStore } from '$lib/api/landTiles.svelte';
  import {
    Pane,
    Folder,
    Monitor,
    Button,
    Separator,
    Color,
    List,
  } from 'svelte-tweakpane-ui';
  import * as THREE from 'three';
  import {
    applyOutlinesToAllLayers,
    clearOutlinesFromAllLayers,
    getOutlineControls,
  } from '../utils/outline-controls.store.svelte';

  interface Props {
    store?: LandTileStore;
  }

  let { store = landStore }: Props = $props();

  // Reactive ownership data
  let ownershipData = $state<{ owner: string; count: number }[]>([]);

  // Derived reactive values
  let totalOwners = $derived(ownershipData.length);
  let totalLands = $derived(
    ownershipData.reduce((sum, { count }) => sum + count, 0),
  );
  let topOwner = $derived(ownershipData.length > 0 ? ownershipData[0] : null);

  // Effect to watch for ownership changes
  $effect(() => {
    // Get the reactive ownership index store
    const ownershipIndexStore = store.getOwnershipIndexStore();

    // Subscribe to changes in the ownership index
    const unsubscribe = ownershipIndexStore.subscribe((ownershipMap) => {
      // Convert the map to an array of owner data with counts
      const owners = Array.from(ownershipMap.entries()).map(
        ([owner, indices]) => ({
          owner,
          count: indices.length,
        }),
      );

      // Sort by land count (descending)
      owners.sort((a, b) => b.count - a.count);

      ownershipData = owners;
    });

    return () => unsubscribe();
  });

  function logOwnershipDetails() {
    console.log('Full ownership details:', ownershipData);
    console.table(
      ownershipData.map(({ owner, count }) => ({
        'Owner Address': owner,
        'Land Count': count,
      })),
    );

    // Also log the raw ownership index map
    const ownershipIndexStore = store.getOwnershipIndexStore();
    ownershipIndexStore.subscribe((map) => {
      console.log('Raw ownership index:', map);
      console.log('Total entries in map:', map.size);
    })();
  }

  function triggerTestUpdate() {
    // Use the palette method to create test data and verify ownership updates
    store.palette();
  }

  // Outline debug functionality
  let outlineColor = $state({ r: 255, g: 0, b: 255 }); // Default purple
  let selectedOwner = $state('');
  let availableOwners = $derived(
    ownershipData.map(({ owner, count }) => ({
      text: `${owner.slice(0, 10)}... (${count} lands)`,
      value: owner,
    })),
  );

  function setOwnerOutlines() {
    if (!selectedOwner) {
      console.log('No owner selected');
      return;
    }

    // Get owned land indices for the selected owner
    const ownedIndices = store.getOwnedLandIndices(selectedOwner);
    console.log(
      `Setting outlines for ${ownedIndices.length} lands owned by ${selectedOwner}`,
    );

    // Convert color to Three.js format
    const threeColor = new THREE.Color(
      outlineColor.r / 255,
      outlineColor.g / 255,
      outlineColor.b / 255,
    );

    // Apply outlines to all sprite layers
    applyOutlinesToAllLayers(ownedIndices, threeColor);
    console.log(
      `Applied ${threeColor.getHexString()} outlines to ${ownedIndices.length} lands owned by ${selectedOwner.slice(0, 10)}...`,
    );
  }

  function clearAllOutlines() {
    clearOutlinesFromAllLayers();
    console.log('Cleared all custom outlines from map');
  }

  function clearOwnerOutlines() {
    if (!selectedOwner) {
      console.log('No owner selected');
      return;
    }

    // Get owned land indices for the selected owner
    const ownedIndices = store.getOwnedLandIndices(selectedOwner);
    console.log(
      `Clearing outlines for ${ownedIndices.length} lands owned by ${selectedOwner}`,
    );

    // Clear outlines for this specific owner's lands only
    clearOutlinesForIndices(ownedIndices);
    console.log(
      `Cleared outlines for ${ownedIndices.length} lands owned by ${selectedOwner.slice(0, 10)}...`,
    );
  }

  function clearOutlinesForIndices(indicesToClear: number[]) {
    const store = getOutlineControls();

    // Clear from building layer
    if (store.buildingControls && store.buildingSprite) {
      clearSpecificIndices(store.buildingSprite, indicesToClear);
    }

    // Clear from biome layer
    if (store.biomeControls && store.biomeSprite) {
      clearSpecificIndices(store.biomeSprite, indicesToClear);
    }
  }

  function clearSpecificIndices(
    instancedMesh: THREE.InstancedMesh,
    indicesToClear: number[],
  ) {
    if (!instancedMesh.geometry.attributes.outlineState) return;

    const outlineStateAttribute = instancedMesh.geometry.attributes
      .outlineState as any;
    const outlineColorAttribute = instancedMesh.geometry.attributes
      .outlineColor as any;
    const outlineStateArray = outlineStateAttribute.array as Float32Array;
    const outlineColorArray = outlineColorAttribute.array as Float32Array;

    // Clear only the specified indices
    indicesToClear.forEach((index) => {
      if (index >= 0 && index < outlineStateArray.length) {
        outlineStateArray[index] = 0.0;
        outlineColorArray[index * 3] = 0.0;
        outlineColorArray[index * 3 + 1] = 0.0;
        outlineColorArray[index * 3 + 2] = 0.0;
      }
    });

    outlineStateAttribute.needsUpdate = true;
    outlineColorAttribute.needsUpdate = true;
  }
</script>

<Pane title="Land Ownership" position="draggable" x={720} y={120}>
  <Folder title="Overview">
    <Monitor value={totalOwners} label="Total Owners" />
    <Monitor value={totalLands} label="Total Owned Lands" />
    <Monitor
      value={totalOwners > 0 ? (totalLands / totalOwners).toFixed(1) : '0'}
      label="Avg Lands/Owner"
    />
  </Folder>

  <Folder title="Top Owner">
    {#if topOwner}
      <Monitor value={topOwner.owner.slice(0, 10) + '...'} label="Address" />
      <Monitor value={topOwner.count} label="Land Count" />
      <Monitor
        value={totalLands > 0
          ? ((topOwner.count / totalLands) * 100).toFixed(1) + '%'
          : '0%'}
        label="% of Total"
      />
    {:else}
      <Monitor value="No owners" label="Status" />
    {/if}
  </Folder>

  <Folder title="Top 10 Owners" expanded={false}>
    {#each ownershipData.slice(0, 10) as { owner, count }, i}
      <Monitor
        value={`${count} lands`}
        label={`${i + 1}. ${owner.slice(0, 8)}...`}
      />
    {/each}
    {#if ownershipData.length > 10}
      <Separator />
      <Monitor
        value={`${ownershipData.length - 10} more owners`}
        label="Hidden"
      />
    {/if}
  </Folder>

  <Folder title="Distribution" expanded={false}>
    {@const smallOwners = ownershipData.filter((o) => o.count <= 5).length}
    {@const mediumOwners = ownershipData.filter(
      (o) => o.count > 5 && o.count <= 20,
    ).length}
    {@const largeOwners = ownershipData.filter((o) => o.count > 20).length}

    <Monitor value={smallOwners} label="Small (≤5 lands)" />
    <Monitor value={mediumOwners} label="Medium (6-20 lands)" />
    <Monitor value={largeOwners} label="Large (>20 lands)" />
  </Folder>

  <Folder title="Actions" expanded={false}>
    <Button
      on:click={logOwnershipDetails}
      label="Log to Console"
      title="Print detailed ownership table to console"
    />
    <Button
      on:click={triggerTestUpdate}
      label="Test Palette"
      title="Create palette test data to verify ownership reactivity"
    />
  </Folder>

  <Folder title="Outline Debug" expanded={false}>
    <Color bind:value={outlineColor} label="Outline Color" />

    <List
      bind:value={selectedOwner}
      options={availableOwners}
      label="Select Owner"
    />

    <Monitor
      value={selectedOwner
        ? `${store.getOwnedLandIndices(selectedOwner).length} lands`
        : 'No owner selected'}
      label="Owner Lands"
    />

    <Separator />

    <Button
      on:click={setOwnerOutlines}
      label="Set Outlines"
      disabled={!selectedOwner}
    />

    <Button
      on:click={clearOwnerOutlines}
      label="Clear Owner"
      disabled={!selectedOwner}
    />

    <Button on:click={clearAllOutlines} label="Clear All" />
  </Folder>
</Pane>
