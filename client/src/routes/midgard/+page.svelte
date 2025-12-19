<script lang="ts">
  import { midgardAPI } from '$lib/midgard/api-store.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { LOSS_BURN_REDUCTION } from '$lib/midgard/constants';
  import { onMount } from 'svelte';

  // Land IDs for selection (simplified grid)
  const LAND_IDS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  // Form state
  let tycoonAddressInput = $state('tycoon_0x123');
  let challengerAddressInput = $state('challenger_0x456');
  let stakeAmountInput = $state('100');
  let activationScoreInput = $state('50');
  let challengeScoreInput = $state('');

  // Refresh interval for stats
  let refreshInterval: ReturnType<typeof setInterval> | null = null;

  onMount(() => {
    // Auto-refresh factory stats every 2 seconds when connected
    refreshInterval = setInterval(() => {
      if (midgardAPI.isConnected && midgardAPI.factoryIsActive) {
        midgardAPI.refreshFactoryStats();
      }
    }, 2000);

    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  });

  // Handlers
  async function handleConnect() {
    try {
      await midgardAPI.connect(tycoonAddressInput, challengerAddressInput);
    } catch (e) {
      console.error('Connection failed:', e);
    }
  }

  function handleDisconnect() {
    midgardAPI.disconnect();
  }

  async function handleCreateFactory() {
    const amount = parseFloat(stakeAmountInput);
    if (isNaN(amount) || amount <= 0) return;
    if (!midgardAPI.selectedLandId) return;

    try {
      await midgardAPI.createFactory(midgardAPI.selectedLandId, amount);
      stakeAmountInput = '100';
    } catch (e) {
      console.error('Create factory failed:', e);
    }
  }

  async function handleActivateFactory() {
    const score = parseInt(activationScoreInput);
    if (isNaN(score) || score < 0 || score > 100) return;

    try {
      await midgardAPI.activateFactory(score);
      activationScoreInput = '50';
    } catch (e) {
      console.error('Activate factory failed:', e);
    }
  }

  async function handleCreateChallenge() {
    try {
      await midgardAPI.createChallenge();
      challengeScoreInput = '';
    } catch (e) {
      console.error('Create challenge failed:', e);
    }
  }

  async function handleCompleteChallenge() {
    const score = parseInt(challengeScoreInput);
    if (isNaN(score) || score < 0 || score > 100) return;

    try {
      await midgardAPI.completeChallenge(score);
      challengeScoreInput = '';
    } catch (e) {
      console.error('Complete challenge failed:', e);
    }
  }

  async function handleCloseFactory() {
    try {
      await midgardAPI.closeFactory();
    } catch (e) {
      console.error('Close factory failed:', e);
    }
  }

  function handleSelectLand(landId: string) {
    midgardAPI.selectedLandId = landId;
    if (midgardAPI.isConnected) {
      midgardAPI.loadFactoryByLand(landId);
    }
  }

  function handleClearFactory() {
    midgardAPI.clearFactory();
  }

  // Format elapsed time
  function formatElapsed(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  }
</script>

<div class="min-h-screen bg-[#1a1a2e] p-6 text-white">
  <!-- Header -->
  <div class="mb-6 flex items-center justify-between">
    <div>
      <h1 class="font-ponzi-number text-3xl">MIDGARD API</h1>
      <p class="text-sm text-gray-500">Database-Backed Mode</p>
    </div>
    <div class="flex items-center gap-4">
      {#if midgardAPI.isConnected}
        <!-- Tycoon Balance -->
        <div class="text-right">
          <span class="text-sm text-purple-400">Tycoon</span>
          <div class="font-ponzi-number text-xl text-yellow-400">
            {midgardAPI.tycoonBalance.toFixed(2)}
          </div>
          <div class="text-xs text-gray-500 truncate max-w-32">
            {midgardAPI.tycoonAddress}
          </div>
        </div>
        <!-- Challenger Balance -->
        <div class="text-right">
          <span class="text-sm text-orange-400">Challenger</span>
          <div class="font-ponzi-number text-xl text-yellow-400">
            {midgardAPI.challengerBalance.toFixed(2)}
          </div>
          <div class="text-xs text-gray-500 truncate max-w-32">
            {midgardAPI.challengerAddress}
          </div>
        </div>
      {/if}
      <a
        href="/midgard/tokenomics"
        class="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium hover:bg-blue-500"
      >
        Tokenomics
      </a>
      <a
        href="/midgard/simulation"
        class="rounded bg-purple-600 px-3 py-1.5 text-sm font-medium hover:bg-purple-500"
      >
        Simulation Mode
      </a>
    </div>
  </div>

  {#if !midgardAPI.isConnected}
    <!-- Connection Form -->
    <div class="mx-auto max-w-md rounded-lg bg-black/40 p-6">
      <h2 class="mb-4 text-xl text-center">Connect Wallets</h2>
      <p class="mb-4 text-sm text-gray-400 text-center">
        Enter wallet addresses for the Tycoon (factory owner) and Challenger.
        New wallets get 1000 $GARD minted automatically.
      </p>

      <div class="mb-4">
        <label class="mb-1 block text-sm text-purple-400">Tycoon Address</label>
        <Input
          type="text"
          bind:value={tycoonAddressInput}
          placeholder="0x..."
          class="bg-black/50"
        />
      </div>

      <div class="mb-4">
        <label class="mb-1 block text-sm text-orange-400"
          >Challenger Address</label
        >
        <Input
          type="text"
          bind:value={challengerAddressInput}
          placeholder="0x..."
          class="bg-black/50"
        />
      </div>

      {#if midgardAPI.error}
        <div class="mb-4 rounded bg-red-500/20 p-2 text-sm text-red-400">
          {midgardAPI.error}
        </div>
      {/if}

      <Button
        variant="blue"
        class="w-full"
        disabled={midgardAPI.isLoading ||
          !tycoonAddressInput ||
          !challengerAddressInput}
        onclick={handleConnect}
      >
        {midgardAPI.isLoading ? 'Connecting...' : 'Connect'}
      </Button>
    </div>
  {:else}
    <!-- Quick Stats Panel -->
    <div class="mb-6 grid grid-cols-4 gap-3 rounded-lg bg-black/30 p-3 text-sm">
      <div class="rounded bg-black/40 p-2 text-center">
        <span class="text-gray-400">Total Supply</span>
        <div class="font-ponzi-number text-lg text-blue-400">
          {midgardAPI.totalSupply.toFixed(2)}
        </div>
      </div>
      <div class="rounded bg-black/40 p-2 text-center">
        <span class="text-gray-400">Locked</span>
        <div class="font-ponzi-number text-lg text-yellow-400">
          {midgardAPI.totalLocked.toFixed(2)}
        </div>
      </div>
      <div class="rounded bg-black/40 p-2 text-center">
        <span class="text-gray-400">Burned</span>
        <div class="font-ponzi-number text-lg text-red-400">
          {midgardAPI.totalBurned.toFixed(2)}
        </div>
      </div>
      <div class="rounded bg-black/40 p-2 text-center">
        <span class="text-gray-400">Status</span>
        <div class="font-ponzi-number text-lg text-green-400">Connected</div>
      </div>
    </div>

    <!-- Disconnect Button Row -->
    <div class="mb-6 flex justify-end">
      <Button variant="red" size="sm" onclick={handleDisconnect}>
        Disconnect
      </Button>
    </div>

    <!-- Main Content -->
    <div class="flex gap-6">
      <!-- Land Grid -->
      <div class="flex-shrink-0">
        <h2 class="mb-3 text-lg text-gray-400">Land Grid</h2>
        <div class="grid grid-cols-3 gap-2">
          {#each LAND_IDS as landId (landId)}
            {@const isSelected = midgardAPI.selectedLandId === landId}
            {@const hasFactory = midgardAPI.currentFactory?.landId === landId}

            <button
              class={[
                'relative flex h-28 w-28 flex-col items-center justify-center rounded-lg border-2 p-2 transition-all',
                {
                  'border-yellow-400 bg-yellow-400/10': isSelected,
                  'border-gray-600 bg-black/40 hover:border-gray-400 hover:bg-black/60':
                    !isSelected,
                },
              ]}
              onclick={() => handleSelectLand(landId)}
            >
              <!-- Factory indicator -->
              {#if hasFactory}
                <div
                  class={[
                    'absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                    {
                      'bg-yellow-500': midgardAPI.factoryIsPending,
                      'bg-purple-500': midgardAPI.factoryIsActive,
                      'bg-gray-500':
                        midgardAPI.currentFactory?.status === 'closed',
                    },
                  ]}
                >
                  {#if midgardAPI.factoryIsPending}
                    P
                  {:else if midgardAPI.factoryIsActive}
                    F
                  {:else}
                    X
                  {/if}
                </div>
              {/if}

              <!-- Land ID -->
              <span class="text-xs text-gray-500">#{landId}</span>
              <span class="font-ponzi-number text-lg">Land</span>

              {#if hasFactory && midgardAPI.currentFactory}
                <span class="text-xs text-purple-400">
                  Staked: {midgardAPI.currentFactory.stakedGard}
                </span>
              {:else}
                <span class="text-xs text-gray-500">Empty</span>
              {/if}
            </button>
          {/each}
        </div>
      </div>

      <!-- Side Panel -->
      <div class="min-w-96 flex-1">
        {#if midgardAPI.selectedLandId}
          <!-- Selected Land Info -->
          <div class="mb-4 rounded-lg bg-black/40 p-4">
            <h2 class="mb-3 text-lg">
              Selected: Land #{midgardAPI.selectedLandId}
            </h2>

            {#if midgardAPI.error}
              <div class="rounded bg-red-500/20 p-2 text-sm text-red-400">
                {midgardAPI.error}
              </div>
            {/if}
          </div>

          {#if !midgardAPI.currentFactory}
            <!-- Factory Creation Form -->
            <div class="rounded-lg bg-black/40 p-4">
              <h3 class="mb-3 text-lg text-purple-400">Create Factory</h3>

              <div class="mb-4">
                <label class="mb-1 block text-sm text-gray-400">
                  Stake $GARD (locked from Tycoon)
                </label>
                <Input
                  type="number"
                  bind:value={stakeAmountInput}
                  placeholder="Enter amount"
                  class="bg-black/50"
                />
                <p class="mt-1 text-xs text-purple-400">
                  Tycoon Balance: {midgardAPI.tycoonBalance.toFixed(2)} $GARD
                </p>
              </div>

              <Button
                variant="blue"
                class="w-full"
                disabled={midgardAPI.isLoading ||
                  parseFloat(stakeAmountInput) <= 0 ||
                  parseFloat(stakeAmountInput) > midgardAPI.tycoonBalance}
                onclick={handleCreateFactory}
              >
                {midgardAPI.isLoading
                  ? 'Creating...'
                  : 'Create Factory (Pending)'}
              </Button>
              <p class="mt-2 text-center text-xs text-gray-500">
                Factory will be created in pending status. You'll need to
                activate it with a score.
              </p>
            </div>
          {:else if midgardAPI.factoryIsPending}
            <!-- Pending Factory - Needs Activation -->
            <div class="rounded-lg bg-black/40 p-4">
              <h3 class="mb-3 text-lg text-yellow-400">Activate Factory</h3>

              <div class="mb-4 rounded bg-yellow-500/20 p-3">
                <p class="text-sm text-yellow-300">
                  Factory is pending. Enter a score (0-100) to activate it.
                </p>
                <p class="mt-1 text-xs text-gray-400">
                  This simulates playing a game to determine the factory's
                  score.
                </p>
              </div>

              <div class="mb-4">
                <label class="mb-1 block text-sm text-gray-400">
                  Factory Score (0-100)
                </label>
                <Input
                  type="number"
                  bind:value={activationScoreInput}
                  min="0"
                  max="100"
                  placeholder="Enter score"
                  class="bg-black/50"
                />
              </div>

              <div class="flex gap-2">
                <Button
                  variant="blue"
                  class="flex-1"
                  disabled={midgardAPI.isLoading ||
                    isNaN(parseInt(activationScoreInput)) ||
                    parseInt(activationScoreInput) < 0 ||
                    parseInt(activationScoreInput) > 100}
                  onclick={handleActivateFactory}
                >
                  {midgardAPI.isLoading ? 'Activating...' : 'Activate Factory'}
                </Button>
                <Button variant="red" onclick={handleClearFactory}>
                  Cancel
                </Button>
              </div>

              <div class="mt-4 border-t border-gray-700 pt-3 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-400">Staked:</span>
                  <span class="font-ponzi-number text-yellow-400">
                    {midgardAPI.currentFactory.stakedGard} $GARD
                  </span>
                </div>
              </div>
            </div>
          {:else if midgardAPI.factoryIsActive}
            <!-- Active Factory -->

            <!-- Challenge Section -->
            {#if !midgardAPI.hasPendingChallenge}
              <div class="mb-4 rounded-lg bg-black/40 p-4">
                <h3 class="mb-3 text-lg text-orange-400">Challenge Factory</h3>

                {#if midgardAPI.factoryStats}
                  <div class="mb-4 space-y-2 text-sm">
                    <div class="flex justify-between rounded bg-black/30 p-2">
                      <span class="text-gray-400">Ticket Cost:</span>
                      <span class="font-ponzi-number text-yellow-400">
                        {midgardAPI.factoryStats.ticketCost.toFixed(4)} $GARD
                      </span>
                    </div>
                    <div class="flex justify-between rounded bg-black/30 p-2">
                      <span class="text-gray-400">Win Reward:</span>
                      <span class="font-ponzi-number text-green-400">
                        {midgardAPI.factoryStats.potentialReward.toFixed(4)} $GARD
                      </span>
                    </div>
                    <div class="flex justify-between rounded bg-black/30 p-2">
                      <span class="text-gray-400">Liquidity Check:</span>
                      {#if midgardAPI.factoryStats.challengeAllowed}
                        <span class="text-green-400">Allowed</span>
                      {:else}
                        <span class="text-red-400">Insufficient inflation</span>
                      {/if}
                    </div>
                  </div>

                  <div class="mb-4 rounded bg-black/30 p-3">
                    <div class="flex items-center justify-between">
                      <span class="text-gray-400">Factory Score to Beat:</span>
                      <span class="font-ponzi-number text-2xl text-purple-400">
                        {midgardAPI.currentFactory?.score}
                      </span>
                    </div>
                    <div class="mt-2 flex items-center justify-between text-sm">
                      <span class="text-gray-400">Challenger Balance:</span>
                      <span class="font-ponzi-number text-orange-400">
                        {midgardAPI.challengerBalance.toFixed(2)} $GARD
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="blue"
                    class="w-full"
                    disabled={midgardAPI.isLoading ||
                      !midgardAPI.factoryStats.challengeAllowed ||
                      midgardAPI.challengerBalance <
                        midgardAPI.factoryStats.ticketCost}
                    onclick={handleCreateChallenge}
                  >
                    {midgardAPI.isLoading
                      ? 'Creating Challenge...'
                      : 'Buy Challenge Ticket'}
                  </Button>

                  {#if !midgardAPI.factoryStats.challengeAllowed}
                    <p class="mt-2 text-center text-xs text-red-400">
                      Factory needs more inflation to pay potential winners
                    </p>
                  {:else if midgardAPI.challengerBalance < midgardAPI.factoryStats.ticketCost}
                    <p class="mt-2 text-center text-xs text-red-400">
                      Insufficient Challenger balance
                    </p>
                  {/if}
                {:else}
                  <p class="text-gray-400">Loading stats...</p>
                {/if}
              </div>
            {:else}
              <!-- Pending Challenge - Submit Score -->
              <div class="mb-4 rounded-lg bg-black/40 p-4">
                <h3 class="mb-3 text-lg text-orange-400">Complete Challenge</h3>

                <div class="mb-4 rounded bg-orange-500/20 p-3">
                  <p class="text-sm text-orange-300">
                    Challenge ticket purchased! Enter your score (0-100) to
                    complete the challenge.
                  </p>
                  <p class="mt-1 text-xs text-gray-400">
                    This simulates playing the game. Score higher than the
                    factory to win!
                  </p>
                </div>

                <div class="mb-4 rounded bg-black/30 p-3">
                  <div class="flex items-center justify-between">
                    <span class="text-gray-400">Factory Score to Beat:</span>
                    <span class="font-ponzi-number text-2xl text-purple-400">
                      {midgardAPI.currentFactory?.score}
                    </span>
                  </div>
                  <div class="mt-2 flex items-center justify-between text-sm">
                    <span class="text-gray-400">Ticket Cost (Paid):</span>
                    <span class="font-ponzi-number text-yellow-400">
                      {midgardAPI.pendingChallenge?.ticketCost.toFixed(4)} $GARD
                    </span>
                  </div>
                  <div class="mt-1 flex items-center justify-between text-sm">
                    <span class="text-gray-400">Potential Win Reward:</span>
                    <span class="font-ponzi-number text-green-400">
                      {midgardAPI.pendingChallenge?.potentialReward.toFixed(4)} $GARD
                    </span>
                  </div>
                </div>

                <div class="mb-4">
                  <label class="mb-1 block text-sm text-gray-400">
                    Your Score (0-100)
                  </label>
                  <Input
                    type="number"
                    bind:value={challengeScoreInput}
                    min="0"
                    max="100"
                    placeholder="Enter your score"
                    class="bg-black/50"
                  />
                </div>

                <Button
                  variant="blue"
                  class="w-full"
                  disabled={midgardAPI.isLoading ||
                    isNaN(parseInt(challengeScoreInput)) ||
                    parseInt(challengeScoreInput) < 0 ||
                    parseInt(challengeScoreInput) > 100}
                  onclick={handleCompleteChallenge}
                >
                  {midgardAPI.isLoading ? 'Completing...' : 'Submit Score'}
                </Button>
                <p class="mt-2 text-center text-xs text-gray-500">
                  Ticket was burned on creation. Complete the challenge to see
                  if you win!
                </p>
              </div>
            {/if}

            <!-- Last Challenge Result -->
            {#if midgardAPI.lastChallengeResult}
              {@const result = midgardAPI.lastChallengeResult}
              <div
                class={[
                  'mb-4 rounded-lg p-4',
                  {
                    'bg-green-500/20': result.won,
                    'bg-red-500/20': !result.won,
                  },
                ]}
              >
                <div class="text-lg font-bold text-center">
                  {result.won ? 'YOU WON!' : 'YOU LOST'}
                </div>
                <div class="text-center text-sm">
                  Your score: {result.playerScore} vs Factory: {result.factoryScore}
                </div>
                <div
                  class={[
                    'font-ponzi-number text-lg text-center',
                    {
                      'text-green-400': result.won,
                      'text-red-400': !result.won,
                    },
                  ]}
                >
                  {result.won ? '+' : ''}{(result.gardChange ?? 0).toFixed(4)} $GARD
                </div>
                {#if !result.won}
                  <div class="mt-1 text-xs text-gray-400 text-center">
                    Factory burn reduced by {(
                      (result.ticketCost ?? 0) * LOSS_BURN_REDUCTION
                    ).toFixed(4)} (={LOSS_BURN_REDUCTION * 100}%)
                  </div>
                {/if}
              </div>
            {/if}

            <!-- Factory Stats -->
            <div class="mb-4 rounded-lg bg-black/40 p-4">
              <div class="flex justify-between items-center mb-3">
                <h3 class="text-lg text-purple-400">Factory Stats</h3>
                <Button
                  variant="red"
                  size="sm"
                  disabled={midgardAPI.isLoading}
                  onclick={handleCloseFactory}
                >
                  Close Factory
                </Button>
              </div>

              <div class="mb-3 grid grid-cols-2 gap-3 text-sm">
                <div class="rounded bg-black/30 p-2">
                  <span class="text-gray-400">Score:</span>
                  <span class="font-ponzi-number ml-2 text-cyan-400">
                    {midgardAPI.currentFactory?.score}
                  </span>
                </div>
                <div class="rounded bg-black/30 p-2">
                  <span class="text-gray-400">Age:</span>
                  <span class="font-ponzi-number ml-2">
                    {midgardAPI.factoryStats
                      ? formatElapsed(midgardAPI.factoryStats.elapsedSeconds)
                      : '-'}
                  </span>
                </div>
                <div class="rounded bg-black/30 p-2">
                  <span class="text-gray-400">Staked:</span>
                  <span class="font-ponzi-number ml-2">
                    {midgardAPI.currentFactory?.stakedGard.toFixed(2)}
                  </span>
                </div>
                <div class="rounded bg-black/30 p-2">
                  <span class="text-gray-400">Challenges:</span>
                  <span class="font-ponzi-number ml-2">
                    <span class="text-green-400"
                      >{midgardAPI.currentFactory?.challengeWins}W</span
                    >
                    /
                    <span class="text-red-400"
                      >{midgardAPI.currentFactory?.challengeLosses}L</span
                    >
                  </span>
                </div>
              </div>

              {#if midgardAPI.factoryStats}
                <div class="space-y-2 border-t border-gray-700 pt-3 text-sm">
                  <div class="flex justify-between">
                    <span class="text-gray-400">Burn Obligation B(t):</span>
                    <span class="font-ponzi-number text-red-400">
                      {midgardAPI.factoryStats.burn.toFixed(4)}
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-400">Effective Burn:</span>
                    <span class="font-ponzi-number text-orange-400">
                      {midgardAPI.factoryStats.effectiveBurn.toFixed(4)}
                    </span>
                  </div>
                  <div
                    class="flex justify-between border-t border-gray-700 pt-2"
                  >
                    <span class="text-gray-400">Inflation I(t):</span>
                    <span class="font-ponzi-number text-green-400">
                      {midgardAPI.factoryStats.inflation.toFixed(4)}
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-400">Available Inflation:</span>
                    <span class="font-ponzi-number text-emerald-400">
                      {midgardAPI.factoryStats.availableInflation.toFixed(4)}
                    </span>
                  </div>
                  <div
                    class="flex justify-between border-t border-gray-700 pt-2"
                  >
                    <span class="text-gray-400">Predicted Net Result:</span>
                    <span
                      class={[
                        'font-ponzi-number',
                        {
                          'text-green-400':
                            midgardAPI.factoryStats.predictedNetResult >= 0,
                          'text-red-400':
                            midgardAPI.factoryStats.predictedNetResult < 0,
                        },
                      ]}
                    >
                      {midgardAPI.factoryStats.predictedNetResult >= 0
                        ? '+'
                        : ''}
                      {midgardAPI.factoryStats.predictedNetResult.toFixed(4)}
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-400">Time to Close:</span>
                    <span class="font-ponzi-number">
                      {formatElapsed(
                        Math.floor(midgardAPI.factoryStats.timeToClose),
                      )}
                    </span>
                  </div>
                </div>
              {/if}
            </div>
          {:else}
            <!-- Closed Factory -->
            <div class="rounded-lg bg-black/40 p-4">
              <h3 class="mb-3 text-lg text-gray-400">Factory Closed</h3>
              <p class="text-sm text-gray-500">
                This factory has been closed. Select another land or create a
                new factory.
              </p>
              <Button
                variant="blue"
                class="mt-4 w-full"
                onclick={handleClearFactory}
              >
                Start New Factory
              </Button>
            </div>
          {/if}
        {:else}
          <!-- No land selected -->
          <div
            class="flex h-64 items-center justify-center rounded-lg bg-black/40 p-4"
          >
            <p class="text-gray-500">Select a land to view details</p>
          </div>
        {/if}
      </div>
    </div>

    <!-- Instructions -->
    <div class="mt-6 rounded-lg bg-black/20 p-4 text-sm text-gray-400">
      <h3 class="mb-2 font-bold text-white">How to Play (API Mode)</h3>
      <div class="grid grid-cols-3 gap-4">
        <div>
          <h4 class="mb-1 font-semibold text-purple-400">1. Create Factory</h4>
          <ul class="list-inside list-disc space-y-1">
            <li>Select a land from the grid</li>
            <li>Enter stake amount and create</li>
            <li>Factory starts in pending status</li>
          </ul>
        </div>
        <div>
          <h4 class="mb-1 font-semibold text-yellow-400">
            2. Activate Factory
          </h4>
          <ul class="list-inside list-disc space-y-1">
            <li>Enter a score (0-100)</li>
            <li>This simulates playing the game</li>
            <li>Factory becomes active with that score</li>
          </ul>
        </div>
        <div>
          <h4 class="mb-1 font-semibold text-orange-400">3. Challenge</h4>
          <ul class="list-inside list-disc space-y-1">
            <li>Buy a challenge ticket</li>
            <li>Enter your score (0-100)</li>
            <li>Beat factory score to win rewards</li>
          </ul>
        </div>
      </div>
    </div>
  {/if}
</div>
