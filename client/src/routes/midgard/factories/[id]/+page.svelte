<script lang="ts">
  import { page } from '$app/stores';
  import { onMount, onDestroy } from 'svelte';
  import { midgardAPI } from '$lib/midgard/api-store.svelte';
  import FactoryStats from '$lib/midgard/components/FactoryStats.svelte';
  import ChallengeForm from '$lib/midgard/components/ChallengeForm.svelte';
  import ChallengeHistory from '$lib/midgard/components/ChallengeHistory.svelte';
  import { formatTime } from '$lib/midgard/formulas';
  import type {
    Factory,
    FactoryStats as FactoryStatsType,
    Challenge,
  } from '$lib/midgard/api-client';

  // State
  let factory = $state<Factory | null>(null);
  let stats = $state<FactoryStatsType | null>(null);
  let challenges = $state<Challenge[]>([]);
  let isLoading = $state(true);
  let error = $state<string | null>(null);

  // Refresh interval
  let refreshInterval: ReturnType<typeof setInterval> | null = null;

  // Factory ID from URL
  const factoryId = $derived($page.params.id);

  // Load factory data
  async function loadFactory() {
    try {
      // Load factory with stats
      const factoryRes = await fetch(`/midgard/api/factories/${factoryId}`);
      if (!factoryRes.ok) {
        throw new Error('Factory not found');
      }
      const data = await factoryRes.json();
      factory = data.factory;
      stats = data.stats;

      // Load challenges
      const challengesRes = await fetch(
        `/midgard/api/factories/${factoryId}/challenges`,
      );
      if (challengesRes.ok) {
        challenges = await challengesRes.json();
      }

      // Also update the store for challenge flow
      midgardAPI.currentFactory = factory;
      midgardAPI.factoryStats = stats;
      midgardAPI.factoryChallenges = challenges;

      error = null;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load factory';
    } finally {
      isLoading = false;
    }
  }

  // Format date
  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString();
  }

  onMount(() => {
    loadFactory();
    // Refresh every 5 seconds
    refreshInterval = setInterval(loadFactory, 5000);
  });

  onDestroy(() => {
    if (refreshInterval) clearInterval(refreshInterval);
  });
</script>

<div>
  <!-- Back Button -->
  <a
    href="/midgard/factories"
    class="mb-4 inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white"
  >
    ← Back to Factories
  </a>

  {#if isLoading}
    <div class="flex h-64 items-center justify-center">
      <p class="text-gray-400">Loading factory...</p>
    </div>
  {:else if error}
    <div class="rounded-lg bg-red-500/20 p-6 text-center text-red-400">
      {error}
    </div>
  {:else if factory}
    <!-- Factory Header -->
    <div class="mb-6 rounded-lg bg-black/40 p-6">
      <div class="flex items-start justify-between">
        <div>
          <h1 class="font-mono text-2xl text-white">
            Factory {factory.id.slice(0, 12)}...
          </h1>
          <div class="mt-2 flex items-center gap-3">
            <span
              class={[
                'rounded px-3 py-1 text-sm font-medium',
                {
                  'bg-yellow-500/20 text-yellow-400':
                    factory.status === 'pending',
                  'bg-purple-500/20 text-purple-400':
                    factory.status === 'active',
                  'bg-gray-500/20 text-gray-400': factory.status === 'closed',
                },
              ]}
            >
              {factory.status.toUpperCase()}
            </span>
            <span class="text-sm text-gray-500">
              Land #{factory.landId}
            </span>
          </div>
        </div>
        <div class="text-right">
          <div class="text-sm text-gray-500">Created</div>
          <div class="text-sm text-gray-300">
            {formatDate(factory.createdAtTime)}
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content Grid -->
    <div class="grid grid-cols-2 gap-6">
      <!-- Left Column: Overview -->
      <div class="space-y-6">
        <!-- Overview Card -->
        <div class="rounded-lg bg-black/40 p-6">
          <h2 class="mb-4 text-lg font-semibold text-purple-400">Overview</h2>
          <div class="space-y-3">
            <div class="flex justify-between">
              <span class="text-gray-500">Owner</span>
              <span class="font-mono text-sm text-gray-300">
                {factory.ownerAddress}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">Score</span>
              <span class="font-ponzi-number text-lg text-cyan-400">
                {factory.score ?? 'Not set'}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">Staked Amount</span>
              <span class="font-ponzi-number text-lg text-purple-400">
                {factory.stakedGard} GARD
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">Challenge Record</span>
              <span class="font-ponzi-number text-lg">
                <span class="text-green-400">{factory.challengeWins}</span>
                <span class="text-gray-500"> W / </span>
                <span class="text-red-400">{factory.challengeLosses}</span>
                <span class="text-gray-500"> L</span>
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">Burn Reductions</span>
              <span class="font-ponzi-number text-yellow-400">
                {factory.burnReductions.toFixed(4)}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">Inflation Paid Out</span>
              <span class="font-ponzi-number text-green-400">
                {factory.inflationPaidOut.toFixed(4)}
              </span>
            </div>
          </div>
        </div>

        <!-- Challenge History -->
        <div class="rounded-lg bg-black/40 p-6">
          <h2 class="mb-4 text-lg font-semibold text-orange-400">
            Challenge History ({challenges.length})
          </h2>
          <ChallengeHistory {challenges} maxHeight="300px" />
        </div>
      </div>

      <!-- Right Column: Economics & Challenge -->
      <div class="space-y-6">
        <!-- Economics Card -->
        {#if stats}
          <div class="rounded-lg bg-black/40 p-6">
            <h2 class="mb-4 text-lg font-semibold text-blue-400">
              Live Economics
            </h2>
            <FactoryStats {stats} />
          </div>
        {/if}

        <!-- Challenge Card -->
        {#if factory.status === 'active' && stats}
          <div class="rounded-lg bg-black/40 p-6">
            <h2 class="mb-4 text-lg font-semibold text-orange-400">
              Challenge This Factory
            </h2>
            <ChallengeForm
              {factoryId}
              ticketCost={stats.ticketCost}
              potentialReward={stats.potentialReward}
              challengeAllowed={stats.challengeAllowed}
            />
          </div>
        {:else if factory.status === 'pending'}
          <div class="rounded-lg bg-yellow-500/20 p-6 text-center">
            <div class="text-lg font-semibold text-yellow-400">
              Factory Pending
            </div>
            <p class="mt-2 text-sm text-gray-400">
              This factory is waiting to be activated by its owner.
            </p>
          </div>
        {:else if factory.status === 'closed'}
          <div class="rounded-lg bg-gray-500/20 p-6 text-center">
            <div class="text-lg font-semibold text-gray-400">
              Factory Closed
            </div>
            <p class="mt-2 text-sm text-gray-500">
              This factory has been closed and can no longer be challenged.
            </p>
            {#if factory.closedAtTime}
              <p class="mt-2 text-xs text-gray-600">
                Closed: {formatDate(factory.closedAtTime)}
              </p>
            {/if}
          </div>
        {/if}

        <!-- Stats Summary -->
        {#if stats}
          <div class="rounded-lg bg-black/40 p-4">
            <div class="grid grid-cols-2 gap-4 text-center text-sm">
              <div>
                <div class="text-gray-500">Time Running</div>
                <div class="font-ponzi-number text-lg text-cyan-400">
                  {formatTime(stats.elapsedSeconds)}
                </div>
              </div>
              <div>
                <div class="text-gray-500">Time to Close</div>
                <div class="font-ponzi-number text-lg text-orange-400">
                  {formatTime(stats.timeToClose)}
                </div>
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
