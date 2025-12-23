<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { midgardAPI } from '$lib/midgard/api-store.svelte';
  import FactoryCard from '$lib/midgard/components/FactoryCard.svelte';
  import FactoryStats from '$lib/midgard/components/FactoryStats.svelte';
  import ChallengeForm from '$lib/midgard/components/ChallengeForm.svelte';
  import ChallengeHistory from '$lib/midgard/components/ChallengeHistory.svelte';
  import { Button } from '$lib/components/ui/button';
  import type { FactoryStats as FactoryStatsType } from '$lib/midgard/api-client';

  // Filter state
  let filterChallengeableOnly = $state(false);

  // Factory stats cache
  let factoryStatsCache = $state<Map<string, FactoryStatsType>>(new Map());

  // Refresh interval
  let refreshInterval: ReturnType<typeof setInterval> | null = null;

  // Filtered factories
  const filteredFactories = $derived(
    filterChallengeableOnly
      ? midgardAPI.factories.filter((f) => {
          const stats = factoryStatsCache.get(f.id);
          return stats?.challengeAllowed;
        })
      : midgardAPI.factories,
  );

  // Load factories and their stats
  async function loadFactories() {
    await midgardAPI.loadFactories();

    // Load stats for each factory
    const newCache = new Map<string, FactoryStatsType>();
    for (const factory of midgardAPI.factories) {
      try {
        const res = await fetch(`/midgard/api/factories/${factory.id}/stats`);
        if (res.ok) {
          const stats = await res.json();
          newCache.set(factory.id, stats);
        }
      } catch {
        // Ignore errors
      }
    }
    factoryStatsCache = newCache;
  }

  // Select a factory
  async function handleSelectFactory(factoryId: string) {
    await midgardAPI.selectFactory(factoryId);
  }

  onMount(() => {
    loadFactories();
    // Refresh every 5 seconds
    refreshInterval = setInterval(async () => {
      await loadFactories();
      // Refresh selected factory stats
      if (midgardAPI.selectedFactoryId) {
        await midgardAPI.refreshFactoryStats();
      }
    }, 5000);
  });

  onDestroy(() => {
    if (refreshInterval) clearInterval(refreshInterval);
  });
</script>

<div class="flex gap-6">
  <!-- Left: Factory List -->
  <div class="w-96 flex-shrink-0">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-lg font-semibold text-orange-400">Active Factories</h2>
      <label class="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          class="rounded border-gray-600 bg-gray-800"
          bind:checked={filterChallengeableOnly}
        />
        <span class="text-gray-400">Challengeable only</span>
      </label>
    </div>

    <!-- Factory List -->
    <div class="max-h-[600px] space-y-2 overflow-y-auto pr-2">
      {#if filteredFactories.length > 0}
        {#each filteredFactories as factory}
          <FactoryCard
            {factory}
            stats={factoryStatsCache.get(factory.id)}
            selected={midgardAPI.selectedFactoryId === factory.id}
            onclick={() => handleSelectFactory(factory.id)}
          />
        {/each}
      {:else}
        <div class="py-8 text-center text-gray-500">
          {#if filterChallengeableOnly}
            No challengeable factories found
          {:else}
            No active factories found
          {/if}
        </div>
      {/if}
    </div>

    <!-- Summary -->
    <div class="mt-4 rounded-lg bg-black/40 p-3 text-sm">
      <div class="flex justify-between text-gray-400">
        <span>Total Factories:</span>
        <span class="font-ponzi-number">{midgardAPI.factories.length}</span>
      </div>
      <div class="flex justify-between text-gray-400">
        <span>Challengeable:</span>
        <span class="font-ponzi-number text-green-400">
          {[...factoryStatsCache.values()].filter((s) => s.challengeAllowed)
            .length}
        </span>
      </div>
    </div>
  </div>

  <!-- Right: Factory Details Panel -->
  <div class="min-w-[450px] flex-1 rounded-lg bg-black/40 p-6">
    {#if midgardAPI.currentFactory && midgardAPI.selectedFactoryId}
      <!-- Factory Header -->
      <div
        class="mb-4 flex items-start justify-between border-b border-gray-800 pb-4"
      >
        <div>
          <div class="flex items-center gap-2">
            <h3 class="font-mono text-lg text-white">
              {midgardAPI.currentFactory.id.slice(0, 12)}...
            </h3>
            <span
              class={[
                'rounded px-2 py-0.5 text-xs font-medium',
                {
                  'bg-purple-500/20 text-purple-400':
                    midgardAPI.currentFactory.status === 'active',
                },
              ]}
            >
              {midgardAPI.currentFactory.status}
            </span>
          </div>
          <div class="mt-1 text-sm text-gray-500">
            Land #{midgardAPI.currentFactory.landId}
          </div>
        </div>
        <a
          href="/midgard/factories/{midgardAPI.currentFactory.id}"
          class="text-sm text-purple-400 hover:text-purple-300"
        >
          View Details →
        </a>
      </div>

      <!-- Factory Info -->
      <div class="mb-4 grid grid-cols-3 gap-3 text-sm">
        <div class="rounded bg-gray-800/50 p-3 text-center">
          <div class="text-xs text-gray-500">Owner</div>
          <div class="font-mono text-xs text-gray-300">
            {midgardAPI.currentFactory.ownerAddress.slice(0, 8)}...
          </div>
        </div>
        <div class="rounded bg-gray-800/50 p-3 text-center">
          <div class="text-xs text-gray-500">Score</div>
          <div class="font-ponzi-number text-lg text-cyan-400">
            {midgardAPI.currentFactory.score ?? '-'}
          </div>
        </div>
        <div class="rounded bg-gray-800/50 p-3 text-center">
          <div class="text-xs text-gray-500">W/L</div>
          <div class="font-ponzi-number">
            <span class="text-green-400">
              {midgardAPI.currentFactory.challengeWins}
            </span>
            <span class="text-gray-500">/</span>
            <span class="text-red-400">
              {midgardAPI.currentFactory.challengeLosses}
            </span>
          </div>
        </div>
      </div>

      <!-- Stats -->
      {#if midgardAPI.factoryStats}
        <FactoryStats stats={midgardAPI.factoryStats} />

        <!-- Challenge Form -->
        <div class="mt-4">
          <ChallengeForm
            factoryId={midgardAPI.currentFactory.id}
            ticketCost={midgardAPI.factoryStats.ticketCost}
            potentialReward={midgardAPI.factoryStats.potentialReward}
            challengeAllowed={midgardAPI.factoryStats.challengeAllowed}
          />
        </div>
      {/if}

      <!-- Challenge History -->
      <div class="mt-4">
        <ChallengeHistory
          challenges={midgardAPI.factoryChallenges}
          maxHeight="150px"
        />
      </div>
    {:else}
      <!-- No Factory Selected -->
      <div
        class="flex h-full min-h-[400px] items-center justify-center text-gray-500"
      >
        <div class="text-center">
          <div class="mb-2 text-4xl">⚔️</div>
          <p>Select a factory to challenge</p>
          <p class="mt-1 text-xs text-gray-600">
            Your balance: {midgardAPI.walletBalance.toFixed(2)} GARD
          </p>
        </div>
      </div>
    {/if}
  </div>
</div>
