<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { landStore } from '$lib/stores/store.svelte';
  import type { LandWithActions } from '$lib/api/land';
  import { BuildingLand } from '$lib/api/land/building_land';
  import { createLandWithActions } from '$lib/utils/land-actions';
  import { locationToCoordinates, parseLocation, shortenHex } from '$lib/utils';
  import { setupClient, useClient } from '$lib/contexts/client.svelte';

  interface NukeTimeComparison {
    landId: string;
    location: { x: number; y: number };
    jsNukeTime: number | null;
    rpcNukeTime: number | null;
    difference: number | null;
    error?: string;
    loading: boolean;
  }

  let landIdInput = $state('');
  let comparisons = $state<NukeTimeComparison[]>([]);
  let isStoreInitialized = $state(false);
  let initializingStore = $state(false);

  const clientPromise = setupClient();

  onMount(async () => {
    if (await clientPromise) {
      await initializeLandStore();
    }
  });

  async function initializeLandStore() {
    initializingStore = true;
    try {
      await landStore.setup(useClient());
      isStoreInitialized = true;
    } catch (error) {
      console.error('Failed to initialize land store:', error);
    } finally {
      initializingStore = false;
    }
  }

  function formatTime(seconds: number | null): string {
    if (seconds === null) return 'N/A';
    if (seconds <= 0) return 'Already nukeable';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  function getDifferenceColor(difference: number | null): string {
    if (difference === null) return 'text-gray-400';

    const absDiff = Math.abs(difference);
    if (absDiff < 60) return 'text-green-400'; // < 1 minute
    if (absDiff < 300) return 'text-yellow-400'; // < 5 minutes
    return 'text-red-400'; // >= 5 minutes
  }

  async function addLandByInput() {
    if (!landIdInput.trim() || !isStoreInitialized) return;

    const landId = landIdInput.trim();
    await addLandComparison(landId);
    landIdInput = '';
  }

  async function addRandomLand() {
    if (!isStoreInitialized) return;

    const allLands = get(landStore.getAllLands());
    const buildingLands = allLands.filter((land) => BuildingLand.is(land));

    if (buildingLands.length === 0) {
      alert('No building lands found in the store');
      return;
    }

    const randomLand =
      buildingLands[Math.floor(Math.random() * buildingLands.length)];
    await addLandComparison(randomLand.locationString);
  }

  async function addLandComparison(landId: string) {
    // Check if already exists
    if (comparisons.some((c) => c.landId === landId)) {
      return;
    }

    const initialComparison: NukeTimeComparison = {
      landId,
      location: { x: 0, y: 0 },
      jsNukeTime: null,
      rpcNukeTime: null,
      difference: null,
      loading: true,
    };

    comparisons = [...comparisons, initialComparison];

    console.log('Starting comparison');

    try {
      // Parse location from landId
      const location = locationToCoordinates(landId);

      // Get the land from store
      const landStore_land = landStore.getLand(location.x, location.y);
      if (!landStore_land) {
        throw new Error('Land not found in store');
      }

      const landValue = get(landStore_land);

      if (!BuildingLand.is(landValue)) {
        throw new Error('Land is not a building land');
      }

      // Create land with actions
      const landWithActions: LandWithActions = createLandWithActions(
        landValue,
        () => landStore.getAllLands(),
      );

      // Calculate JS nuke time
      const jsTime = await landWithActions.getEstimatedNukeTime();

      // Calculate RPC nuke time
      const rpcTimeRaw =
        Number(
          await useClient().client.actions.getTimeToNuke(
            landValue.locationString,
          ),
        ) -
        Date.now() / 1000;

      // Convert BigInt to number if needed
      const jsTimeNum =
        typeof jsTime === 'bigint' ? Number(jsTime) : jsTime || 0;
      const rpcTimeNum =
        typeof rpcTimeRaw === 'bigint' ? Number(rpcTimeRaw) : rpcTimeRaw || 0;

      // Create updated comparison object
      const updatedComparison: NukeTimeComparison = {
        ...initialComparison,
        location,
        jsNukeTime: jsTimeNum,
        rpcNukeTime: rpcTimeNum,
        difference: jsTimeNum - rpcTimeNum,
        loading: false,
      };

      // Update the array by finding and replacing the comparison
      comparisons = comparisons.map((c) =>
        c.landId === landId ? updatedComparison : c,
      );
    } catch (error) {
      const errorComparison: NukeTimeComparison = {
        ...initialComparison,
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false,
      };

      // Update the array by finding and replacing the comparison
      comparisons = comparisons.map((c) =>
        c.landId === landId ? errorComparison : c,
      );
    } finally {
      console.log('Comparison completed');
    }
  }

  function removeLand(landId: string) {
    comparisons = comparisons.filter((c) => c.landId !== landId);
  }

  function clearAll() {
    comparisons = [];
  }
</script>

<div class="container mx-auto p-4 max-w-6xl">
  <div class="mb-6">
    <h1 class="text-3xl font-bold text-white mb-2">
      Debug: Nuke Time Comparison
    </h1>
    <p class="text-gray-400">
      Compare JavaScript computed nuke times vs RPC computed nuke times for
      lands.
    </p>
  </div>

  <!-- Store Status -->
  <Card class="mb-6 shadow-ponzi">
    <CardHeader>
      <CardTitle>Land Store Status</CardTitle>
    </CardHeader>
    <CardContent>
      {#if initializingStore}
        <div class="text-yellow-400">Initializing land store...</div>
      {:else if isStoreInitialized}
        <div class="text-green-400">✓ Land store initialized and ready</div>
      {:else}
        <div class="text-red-400">✗ Land store not initialized</div>
        <Button class="mt-2" on:click={initializeLandStore}>
          Initialize Store
        </Button>
      {/if}
    </CardContent>
  </Card>

  <!-- Controls -->
  <Card class="mb-6 shadow-ponzi">
    <CardHeader>
      <CardTitle>Add Land for Comparison</CardTitle>
    </CardHeader>
    <CardContent>
      <div class="flex flex-col gap-4">
        <div class="flex gap-2 items-end">
          <div class="flex-1">
            <Label for="land-id">Land ID (hex format)</Label>
            <Input
              id="land-id"
              bind:value={landIdInput}
              placeholder="e.g., 0x1234567890abcdef"
              disabled={!isStoreInitialized}
            />
          </div>
          <Button
            onclick={addLandByInput}
            disabled={!isStoreInitialized || !landIdInput.trim()}
          >
            Add Land
          </Button>
        </div>

        <div class="flex gap-2">
          <Button
            variant="red"
            onclick={addRandomLand}
            disabled={!isStoreInitialized}
          >
            🎲 I'm Feeling Lucky
          </Button>

          {#if comparisons.length > 0}
            <Button variant="red" onclick={clearAll}>Clear All</Button>
          {/if}
        </div>
      </div>
    </CardContent>
  </Card>

  <!-- Results Grid -->
  {#if comparisons.length > 0}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each comparisons as comparison (comparison.landId)}
        <Card class="shadow-ponzi relative">
          <CardHeader class="pb-2">
            <div class="flex justify-between items-start">
              <CardTitle class="text-sm font-mono">
                {shortenHex(comparison.landId)}
              </CardTitle>
              <Button
                size="sm"
                variant="red"
                onclick={() => removeLand(comparison.landId)}
                class="text-xs"
              >
                ✕
              </Button>
            </div>
            <div class="text-xs text-gray-400">
              Location: ({comparison.location.x}, {comparison.location.y})
            </div>
          </CardHeader>

          <CardContent class="space-y-3">
            {#if comparison.loading}
              <div class="text-center py-4 text-yellow-400">Calculating...</div>
            {:else if comparison.error}
              <div class="text-red-400 text-sm">
                Error: {comparison.error}
              </div>
            {:else}
              <div class="space-y-2">
                <div class="flex justify-between">
                  <span class="text-gray-300">JS Time:</span>
                  <span class="text-blue-400 font-mono text-sm">
                    {formatTime(comparison.jsNukeTime)}
                  </span>
                </div>

                <div class="flex justify-between">
                  <span class="text-gray-300">RPC Time:</span>
                  <span class="text-green-400 font-mono text-sm">
                    {formatTime(comparison.rpcNukeTime)}
                  </span>
                </div>

                <hr class="border-gray-600" />

                <div class="flex justify-between items-center">
                  <span class="text-gray-300">Difference:</span>
                  <span
                    class="font-mono text-sm {getDifferenceColor(
                      comparison.difference,
                    )}"
                  >
                    {#if comparison.difference !== null}
                      {comparison.difference > 0
                        ? '+'
                        : ''}{comparison.difference}s
                    {:else}
                      N/A
                    {/if}
                  </span>
                </div>

                {#if comparison.difference !== null}
                  <div class="text-xs text-gray-500">
                    {comparison.difference > 0
                      ? 'JS is higher'
                      : comparison.difference < 0
                        ? 'RPC is higher'
                        : 'Identical'}
                  </div>
                {/if}
              </div>
            {/if}
          </CardContent>
        </Card>
      {/each}
    </div>
  {:else}
    <Card class="shadow-ponzi">
      <CardContent class="text-center py-8 text-gray-400">
        No lands added yet. Add a land by entering its ID or clicking "I'm
        Feeling Lucky".
      </CardContent>
    </Card>
  {/if}
</div>

<style>
  :global(.shadow-ponzi) {
    box-shadow:
      0 4px 6px -1px rgba(0, 0, 0, 0.5),
      0 2px 4px -1px rgba(0, 0, 0, 0.3);
  }
</style>
