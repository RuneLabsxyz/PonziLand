<script lang="ts">
  import { landStore } from '$lib/stores/store.svelte';
  import type { LandTileStore } from '$lib/api/land_tiles.svelte';
  import {
    Pane,
    Folder,
    Monitor,
    Button,
    Separator,
  } from 'svelte-tweakpane-ui';

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
</Pane>
