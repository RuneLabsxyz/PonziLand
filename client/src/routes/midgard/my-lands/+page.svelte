<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { midgardAPI } from '$lib/midgard/api-store.svelte';
  import { INITIAL_LANDS, GRID_SIZE } from '$lib/midgard/constants';
  import LandCard from '$lib/midgard/components/LandCard.svelte';
  import FactoryStats from '$lib/midgard/components/FactoryStats.svelte';
  import ChallengeForm from '$lib/midgard/components/ChallengeForm.svelte';
  import ChallengeHistory from '$lib/midgard/components/ChallengeHistory.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';

  // Land selection
  let selectedLandId = $state<number | null>(null);
  let stakeInput = $state('');
  let scoreInput = $state('');

  // Factory lookup map
  let landFactories = $state<Map<string, typeof midgardAPI.currentFactory>>(
    new Map(),
  );

  // Refresh interval
  let refreshInterval: ReturnType<typeof setInterval> | null = null;

  // Get factory for a land
  function getFactoryForLand(landId: number) {
    return landFactories.get(String(landId)) ?? null;
  }

  // Load factories for all lands
  async function loadAllFactories() {
    const newMap = new Map<string, typeof midgardAPI.currentFactory>();
    for (const land of INITIAL_LANDS) {
      try {
        const factory = await fetch(
          `/midgard/api/factories/by-land/${land.id}`,
        ).then((r) => (r.ok ? r.json() : null));
        if (factory) {
          newMap.set(String(land.id), factory);
        }
      } catch {
        // Ignore errors for individual lands
      }
    }
    landFactories = newMap;
  }

  // Select a land
  async function handleSelectLand(landId: number) {
    selectedLandId = landId;
    await midgardAPI.loadFactoryByLand(String(landId));

    // Set default stake to land's stake amount
    const land = INITIAL_LANDS.find((l) => l.id === landId);
    if (land && !midgardAPI.currentFactory) {
      stakeInput = String(land.stakeAmount);
    }
  }

  // Create factory
  async function handleCreateFactory() {
    if (selectedLandId === null) return;
    const stake = parseFloat(stakeInput);
    if (isNaN(stake) || stake <= 0) return;

    try {
      await midgardAPI.createFactory(String(selectedLandId), stake);
      await loadAllFactories();
    } catch (e) {
      console.error('Failed to create factory:', e);
    }
  }

  // Activate factory
  async function handleActivateFactory() {
    const score = parseInt(scoreInput);
    if (isNaN(score) || score < 0 || score > 100) return;

    try {
      await midgardAPI.activateFactory(score);
      await loadAllFactories();
      scoreInput = '';
    } catch (e) {
      console.error('Failed to activate factory:', e);
    }
  }

  // Close factory
  async function handleCloseFactory() {
    try {
      await midgardAPI.closeFactory();
      await loadAllFactories();
    } catch (e) {
      console.error('Failed to close factory:', e);
    }
  }

  // Start new on same land
  function handleStartNew() {
    midgardAPI.clearFactory();
    const land = INITIAL_LANDS.find((l) => l.id === selectedLandId);
    if (land) {
      stakeInput = String(land.stakeAmount);
    }
  }

  // Get selected land data
  const selectedLand = $derived(
    selectedLandId !== null
      ? INITIAL_LANDS.find((l) => l.id === selectedLandId)
      : null,
  );

  onMount(() => {
    loadAllFactories();
    // Auto-refresh every 5 seconds
    refreshInterval = setInterval(async () => {
      if (midgardAPI.currentFactory?.status === 'active') {
        await midgardAPI.refreshFactoryStats();
      }
    }, 5000);
  });

  onDestroy(() => {
    if (refreshInterval) clearInterval(refreshInterval);
  });
</script>

<div class="flex gap-6">
  <!-- Left: Land Grid -->
  <div class="flex-shrink-0">
    <h2 class="mb-4 text-lg font-semibold text-purple-400">PonziLands</h2>

    <!-- 3x3 Grid -->
    <div
      class="grid gap-2"
      style="grid-template-columns: repeat({GRID_SIZE}, 1fr)"
    >
      {#each INITIAL_LANDS as land}
        <LandCard
          {land}
          factory={getFactoryForLand(land.id)}
          selected={selectedLandId === land.id}
          onclick={() => handleSelectLand(land.id)}
        />
      {/each}
    </div>

    <!-- Legend -->
    <div class="mt-4 flex gap-4 text-xs text-gray-500">
      <div class="flex items-center gap-1">
        <div class="h-3 w-3 rounded-full bg-yellow-500"></div>
        <span>Pending</span>
      </div>
      <div class="flex items-center gap-1">
        <div class="h-3 w-3 rounded-full bg-purple-500"></div>
        <span>Active</span>
      </div>
      <div class="flex items-center gap-1">
        <div class="h-3 w-3 rounded-full bg-gray-500"></div>
        <span>Closed</span>
      </div>
    </div>
  </div>

  <!-- Right: Details Panel -->
  <div class="min-w-[400px] flex-1 rounded-lg bg-black/40 p-6">
    {#if selectedLand}
      <!-- Land Header -->
      <div class="mb-4 border-b border-gray-800 pb-4">
        <h3 class="text-xl font-semibold text-white">
          Land #{selectedLand.id}
        </h3>
        <div class="mt-2 flex gap-4 text-sm">
          <div>
            <span class="text-gray-500">Sell Price:</span>
            <span class="font-ponzi-number ml-1 text-white">
              {selectedLand.sellPrice} GARD
            </span>
          </div>
          <div>
            <span class="text-gray-500">Stake:</span>
            <span class="font-ponzi-number ml-1 text-white">
              {selectedLand.stakeAmount} GARD
            </span>
          </div>
        </div>
      </div>

      {#if !midgardAPI.currentFactory}
        <!-- No Factory: Create Form -->
        <div class="space-y-4">
          <h4 class="text-sm font-semibold text-purple-400">Create Factory</h4>
          <p class="text-sm text-gray-400">
            Stake GARD to create a factory on this land. Your stake will be
            locked and gradually burned over time.
          </p>
          <div>
            <label class="mb-1 block text-sm text-gray-500">Stake Amount</label>
            <Input
              type="number"
              placeholder="Amount to stake"
              class="bg-gray-800"
              bind:value={stakeInput}
            />
          </div>
          <Button
            variant="blue"
            class="w-full"
            disabled={midgardAPI.isLoading ||
              isNaN(parseFloat(stakeInput)) ||
              parseFloat(stakeInput) <= 0 ||
              parseFloat(stakeInput) > midgardAPI.walletBalance}
            onclick={handleCreateFactory}
          >
            {#if midgardAPI.isLoading}
              Creating...
            {:else if parseFloat(stakeInput) > midgardAPI.walletBalance}
              Insufficient Balance
            {:else}
              Create Factory
            {/if}
          </Button>
        </div>
      {:else if midgardAPI.currentFactory.status === 'pending'}
        <!-- Pending Factory: Activate Form -->
        <div class="space-y-4">
          <div class="rounded-lg bg-yellow-500/20 p-4">
            <h4 class="text-sm font-semibold text-yellow-400">
              Factory Pending Activation
            </h4>
            <p class="mt-1 text-sm text-gray-400">
              Play the game to set your factory's score. This score will be used
              to determine challenge outcomes.
            </p>
          </div>

          <div class="rounded bg-gray-800/50 p-3">
            <div class="text-xs text-gray-500">Staked Amount</div>
            <div class="font-ponzi-number text-lg text-purple-400">
              {midgardAPI.currentFactory.stakedGard} GARD
            </div>
          </div>

          <div>
            <label class="mb-1 block text-sm text-gray-500">
              Your Score (0-100)
            </label>
            <Input
              type="number"
              placeholder="Enter your game score"
              min="0"
              max="100"
              class="bg-gray-800"
              bind:value={scoreInput}
            />
          </div>

          <Button
            variant="blue"
            class="w-full bg-yellow-600 hover:bg-yellow-500"
            disabled={midgardAPI.isLoading ||
              isNaN(parseInt(scoreInput)) ||
              parseInt(scoreInput) < 0 ||
              parseInt(scoreInput) > 100}
            onclick={handleActivateFactory}
          >
            {midgardAPI.isLoading ? 'Activating...' : 'Activate Factory'}
          </Button>
        </div>
      {:else if midgardAPI.currentFactory.status === 'active'}
        <!-- Active Factory: Stats & Challenge -->
        <div class="space-y-4">
          <!-- Factory Overview -->
          <div class="flex items-center justify-between">
            <div>
              <span
                class="rounded bg-purple-500/20 px-2 py-1 text-xs font-medium text-purple-400"
              >
                Active
              </span>
              <span class="ml-2 text-sm text-gray-400">
                Score: <span class="font-ponzi-number text-cyan-400">
                  {midgardAPI.currentFactory.score}
                </span>
              </span>
            </div>
            <div class="text-sm">
              <span class="text-gray-500">W/L:</span>
              <span class="font-ponzi-number ml-1 text-green-400">
                {midgardAPI.currentFactory.challengeWins}
              </span>
              <span class="text-gray-500">/</span>
              <span class="font-ponzi-number text-red-400">
                {midgardAPI.currentFactory.challengeLosses}
              </span>
            </div>
          </div>

          <div class="rounded bg-gray-800/50 p-3">
            <div class="text-xs text-gray-500">Staked Amount</div>
            <div class="font-ponzi-number text-lg text-purple-400">
              {midgardAPI.currentFactory.stakedGard} GARD
            </div>
          </div>

          <!-- Stats -->
          {#if midgardAPI.factoryStats}
            <FactoryStats stats={midgardAPI.factoryStats} />

            <!-- Challenge Form -->
            <ChallengeForm
              ticketCost={midgardAPI.factoryStats.ticketCost}
              potentialReward={midgardAPI.factoryStats.potentialReward}
              challengeAllowed={midgardAPI.factoryStats.challengeAllowed}
            />
          {/if}

          <!-- Challenge History -->
          <ChallengeHistory challenges={midgardAPI.factoryChallenges} />

          <!-- Close Factory Button -->
          <Button
            variant="red"
            class="w-full"
            disabled={midgardAPI.isLoading}
            onclick={handleCloseFactory}
          >
            Close Factory
          </Button>
        </div>
      {:else if midgardAPI.currentFactory.status === 'closed'}
        <!-- Closed Factory -->
        <div class="space-y-4 text-center">
          <div class="rounded-lg bg-gray-500/20 p-6">
            <div class="text-lg font-semibold text-gray-400">
              Factory Closed
            </div>
            <p class="mt-2 text-sm text-gray-500">
              This factory has been closed. You can create a new factory on this
              land.
            </p>
          </div>
          <Button variant="blue" class="w-full" onclick={handleStartNew}>
            Create New Factory
          </Button>
        </div>
      {/if}
    {:else}
      <!-- No Land Selected -->
      <div class="flex h-full items-center justify-center text-gray-500">
        <div class="text-center">
          <div class="mb-2 text-4xl">🏭</div>
          <p>Select a land to manage your factory</p>
        </div>
      </div>
    {/if}
  </div>
</div>
