<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { midgardAPI } from '$lib/midgard/api-store.svelte';
  import {
    ponziLandStore,
    type OwnedLand,
  } from '$lib/midgard/ponzi-land-store.svelte';
  import LandCard from '$lib/midgard/components/LandCard.svelte';
  import FactoryStats from '$lib/midgard/components/FactoryStats.svelte';
  import ChallengeForm from '$lib/midgard/components/ChallengeForm.svelte';
  import ChallengeHistory from '$lib/midgard/components/ChallengeHistory.svelte';
  import FlappyGameModal from '$lib/midgard/components/game/FlappyGameModal.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { getTokenInfo } from '$lib/utils';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';

  // Land selection
  let selectedLandId = $state<number | null>(null);
  let stakeInput = $state('');
  let showActivationGame = $state(false);

  // Factory lookup map
  let landFactories = $state<Map<number, typeof midgardAPI.currentFactory>>(
    new Map(),
  );

  // Refresh interval
  let refreshInterval: ReturnType<typeof setInterval> | null = null;

  // Get factory for a land
  function getFactoryForLand(location: number) {
    return landFactories.get(location) ?? null;
  }

  // Load factories for all owned lands
  async function loadAllFactories() {
    const newMap = new Map<number, typeof midgardAPI.currentFactory>();
    for (const land of ponziLandStore.lands) {
      try {
        const factory = await fetch(
          `/midgard/api/factories/by-land/${land.location}`,
        ).then((r) => (r.ok ? r.json() : null));
        if (factory) {
          newMap.set(land.location, factory);
        }
      } catch {
        // Ignore errors for individual lands
      }
    }
    landFactories = newMap;
  }

  // Select a land
  async function handleSelectLand(location: number) {
    selectedLandId = location;
    await midgardAPI.loadFactoryByLand(String(location));

    // Set default stake based on land's stake
    const land = ponziLandStore.lands.find((l) => l.location === location);
    if (land && !midgardAPI.currentFactory) {
      const token = getTokenInfo(land.tokenUsed);
      if (token) {
        stakeInput = CurrencyAmount.fromUnscaled(
          land.stakeAmount,
          token,
        ).toString();
      }
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

  // Open activation game modal
  function openActivationGame() {
    showActivationGame = true;
  }

  // Activate factory with game score
  async function handleActivateWithScore(score: number) {
    showActivationGame = false;
    try {
      await midgardAPI.activateFactory(score);
      await loadAllFactories();
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
    const land = ponziLandStore.lands.find(
      (l) => l.location === selectedLandId,
    );
    if (land) {
      const token = getTokenInfo(land.tokenUsed);
      if (token) {
        stakeInput = CurrencyAmount.fromUnscaled(
          land.stakeAmount,
          token,
        ).toString();
      }
    }
  }

  // Get selected land data
  const selectedLand = $derived(
    selectedLandId !== null
      ? ponziLandStore.lands.find((l) => l.location === selectedLandId)
      : null,
  );

  // Format selected land prices
  const selectedLandToken = $derived(
    selectedLand ? getTokenInfo(selectedLand.tokenUsed) : null,
  );
  const selectedLandPrice = $derived(
    selectedLand && selectedLandToken
      ? CurrencyAmount.fromUnscaled(
          selectedLand.sellPrice,
          selectedLandToken,
        ).toString()
      : '0',
  );
  const selectedLandStake = $derived(
    selectedLand && selectedLandToken
      ? CurrencyAmount.fromUnscaled(
          selectedLand.stakeAmount,
          selectedLandToken,
        ).toString()
      : '0',
  );

  onMount(async () => {
    // Setup ponzi land store
    await ponziLandStore.setup();
    // Load factories after lands are loaded
    await loadAllFactories();

    // Auto-refresh every 5 seconds
    refreshInterval = setInterval(async () => {
      if (midgardAPI.currentFactory?.status === 'active') {
        await midgardAPI.refreshFactoryStats();
      }
    }, 5000);
  });

  onDestroy(() => {
    if (refreshInterval) clearInterval(refreshInterval);
    ponziLandStore.cleanup();
  });
</script>

<div class="flex gap-6">
  <!-- Left: Land List -->
  <div class="w-96 flex-shrink-0">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-lg font-semibold text-purple-400">My PonziLands</h2>
      <span class="text-sm text-gray-500">
        {ponziLandStore.lands.length} lands
      </span>
    </div>

    <!-- Land List -->
    <div class="max-h-[600px] space-y-2 overflow-y-auto pr-2">
      {#if ponziLandStore.isLoading}
        <div class="py-8 text-center text-gray-500">Loading lands...</div>
      {:else if ponziLandStore.error}
        <div class="py-8 text-center text-red-400">
          {ponziLandStore.error}
        </div>
      {:else if ponziLandStore.lands.length > 0}
        {#each ponziLandStore.lands as land}
          <LandCard
            {land}
            factory={getFactoryForLand(land.location)}
            selected={selectedLandId === land.location}
            onclick={() => handleSelectLand(land.location)}
          />
        {/each}
      {:else}
        <div class="py-8 text-center text-gray-500">
          <p>No lands found</p>
          <p class="mt-2 text-xs">Buy lands in PonziLand to see them here</p>
        </div>
      {/if}
    </div>
  </div>

  <!-- Right: Details Panel -->
  <div class="min-w-[400px] flex-1 rounded-lg bg-black/40 p-6">
    {#if selectedLand}
      <!-- Land Header -->
      <div class="mb-4 border-b border-gray-800 pb-4">
        <h3 class="text-xl font-semibold text-white">
          Land #{selectedLand.location}
        </h3>
        <div class="mt-1 text-xs text-gray-500">
          Position: ({selectedLand.coordinates.x}, {selectedLand.coordinates.y})
        </div>
        <div class="mt-2 flex gap-4 text-sm">
          <div>
            <span class="text-gray-500">Price:</span>
            <span class="font-ponzi-number ml-1 text-white">
              {selectedLandPrice}
              {selectedLandToken?.symbol ?? ''}
            </span>
          </div>
          <div>
            <span class="text-gray-500">Stake:</span>
            <span class="font-ponzi-number ml-1 text-white">
              {selectedLandStake}
              {selectedLandToken?.symbol ?? ''}
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

          <Button
            variant="blue"
            class="w-full bg-yellow-600 hover:bg-yellow-500"
            disabled={midgardAPI.isLoading}
            onclick={openActivationGame}
          >
            {midgardAPI.isLoading ? 'Activating...' : 'Play to Activate'}
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

<!-- Game Modal for Factory Activation -->
<FlappyGameModal
  visible={showActivationGame}
  title="Activate Factory"
  onClose={() => (showActivationGame = false)}
  onScoreSubmit={handleActivateWithScore}
/>
