<script lang="ts">
  import { midgardGame } from '$lib/midgard/game-state.svelte';
  import { hasFactory } from '$lib/midgard/types';
  import type { Land } from '$lib/midgard/types';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Slider } from '$lib/components/ui/slider';
  import { onDestroy } from 'svelte';

  // Factory creation state
  let lockAmount = $state<string>('100');

  // Challenge state
  let challengeCost = $state<string>('10');

  // Cleanup on destroy
  onDestroy(() => {
    midgardGame.destroy();
  });

  // Get factory from land (type-safe helper)
  function getFactory(land: Land) {
    if (hasFactory(land)) {
      return land.factory;
    }
    return null;
  }

  // Get stake percentage for color
  function getStakePercent(land: Land): number {
    return (land.stakeAmount / land.initialStakeAmount) * 100;
  }

  // Get stake color based on percentage
  function getStakeColor(percent: number): string {
    if (percent > 66) return 'text-green-400';
    if (percent > 33) return 'text-yellow-400';
    return 'text-red-400';
  }

  // Handle factory creation
  function handleCreateFactory() {
    const amount = parseFloat(lockAmount);
    if (isNaN(amount) || amount <= 0) return;
    if (midgardGame.selectedLandId === null) return;

    const success = midgardGame.createFactory(
      midgardGame.selectedLandId,
      amount,
    );
    if (success) {
      lockAmount = '100';
    }
  }

  // Handle challenge
  function handleChallenge() {
    const cost = parseFloat(challengeCost);
    if (isNaN(cost) || cost <= 0) return;
    if (midgardGame.selectedLandId === null) return;

    midgardGame.challenge(midgardGame.selectedLandId, cost);
  }

  // Slider value binding (needs array)
  let timeSliderValue = $state<number[]>([1]);

  $effect(() => {
    midgardGame.setTimeMultiplier(timeSliderValue[0]);
  });
</script>

<div class="min-h-screen bg-[#1a1a2e] p-6 text-white">
  <!-- Header -->
  <div class="mb-6 flex items-center justify-between">
    <h1 class="font-ponzi-number text-3xl">MIDGARD POC</h1>
    <div class="flex items-center gap-4">
      <span class="text-gray-400">$GARD Balance:</span>
      <span class="font-ponzi-number text-2xl text-yellow-400">
        {midgardGame.playerGardBalance.toFixed(2)}
      </span>
      <Button variant="red" size="md" onclick={() => midgardGame.reset()}
        >Reset</Button
      >
    </div>
  </div>

  <!-- Controls -->
  <div class="mb-6 flex items-center gap-6 rounded-lg bg-black/30 p-4">
    <Button
      variant={midgardGame.isPlaying ? 'red' : 'blue'}
      onclick={() => midgardGame.togglePlay()}
    >
      {midgardGame.isPlaying ? 'Pause' : 'Play'}
    </Button>

    <div class="flex items-center gap-3">
      <span class="text-gray-400">Time Speed:</span>
      <div class="w-32">
        <Slider bind:value={timeSliderValue} min={0.5} max={3} step={0.5} />
      </div>
      <span class="font-ponzi-number w-12 text-center"
        >{timeSliderValue[0]}x</span
      >
    </div>

    <div
      class={[
        'ml-auto flex items-center gap-2 rounded-full px-3 py-1',
        {
          'bg-green-500/20': midgardGame.isPlaying,
          'bg-gray-500/20': !midgardGame.isPlaying,
        },
      ]}
    >
      <div
        class={[
          'h-2 w-2 rounded-full',
          {
            'animate-pulse bg-green-500': midgardGame.isPlaying,
            'bg-gray-500': !midgardGame.isPlaying,
          },
        ]}
      ></div>
      <span class="text-sm">{midgardGame.isPlaying ? 'Running' : 'Paused'}</span
      >
    </div>
  </div>

  <!-- Main Content -->
  <div class="flex gap-6">
    <!-- Land Grid -->
    <div class="flex-shrink-0">
      <h2 class="mb-3 text-lg text-gray-400">Land Grid</h2>
      <div class="grid grid-cols-3 gap-2">
        {#each midgardGame.lands as land (land.id)}
          {@const stakePercent = getStakePercent(land)}
          {@const stakeColor = getStakeColor(stakePercent)}
          {@const isSelected = midgardGame.selectedLandId === land.id}
          {@const landHasFactory = hasFactory(land)}

          <button
            class={[
              'relative flex h-28 w-28 flex-col items-center justify-center rounded-lg border-2 p-2 transition-all',
              {
                'border-yellow-400 bg-yellow-400/10': isSelected,
                'border-gray-600 bg-black/40 hover:border-gray-400 hover:bg-black/60':
                  !isSelected,
              },
            ]}
            onclick={() => midgardGame.selectLand(land.id)}
          >
            <!-- Factory indicator -->
            {#if landHasFactory}
              <div
                class="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-purple-500 text-xs font-bold"
              >
                F
              </div>
            {/if}

            <!-- Land ID -->
            <span class="text-xs text-gray-500">#{land.id}</span>

            <!-- Sell Price -->
            <span class="font-ponzi-number text-lg">${land.sellPrice}</span>

            <!-- Stake Amount -->
            <div class="mt-1 flex flex-col items-center">
              <span class={['text-xs', stakeColor]}>
                Stake: {land.stakeAmount.toFixed(0)}
              </span>
              <!-- Stake bar -->
              <div
                class="mt-1 h-1.5 w-16 overflow-hidden rounded-full bg-gray-700"
              >
                <div
                  class={[
                    'h-full transition-all',
                    {
                      'bg-green-500': stakePercent > 66,
                      'bg-yellow-500': stakePercent > 33 && stakePercent <= 66,
                      'bg-red-500': stakePercent <= 33,
                    },
                  ]}
                  style="width: {stakePercent}%"
                ></div>
              </div>
            </div>
          </button>
        {/each}
      </div>
    </div>

    <!-- Side Panel -->
    <div class="min-w-80 flex-1">
      {#if midgardGame.selectedLand}
        {@const land = midgardGame.selectedLand}
        {@const landHasFactory = hasFactory(land)}

        <!-- Selected Land Info -->
        <div class="mb-4 rounded-lg bg-black/40 p-4">
          <h2 class="mb-3 text-lg">
            Selected: Land #{land.id}
            <span class="text-gray-500">
              ({land.position.row}, {land.position.col})
            </span>
          </h2>
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span class="text-gray-400">Sell Price:</span>
              <span class="font-ponzi-number ml-2">${land.sellPrice}</span>
            </div>
            <div>
              <span class="text-gray-400">Stake:</span>
              <span class={['ml-2', getStakeColor(getStakePercent(land))]}>
                {land.stakeAmount.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {#if !landHasFactory}
          <!-- Factory Creation Form -->
          <div class="rounded-lg bg-black/40 p-4">
            <h3 class="mb-3 text-lg text-purple-400">Create Factory</h3>

            <!-- Lock Amount Input -->
            <div class="mb-4">
              <label class="mb-1 block text-sm text-gray-400"
                >Lock Amount ($GARD)</label
              >
              <Input
                type="number"
                bind:value={lockAmount}
                placeholder="Enter amount"
                class="bg-black/50"
              />
              <p class="mt-1 text-xs text-gray-500">
                Available: {midgardGame.playerGardBalance.toFixed(2)} $GARD
              </p>
            </div>

            <!-- Score Mini-game -->
            <div class="mb-4">
              <label class="mb-1 block text-sm text-gray-400"
                >Factory Score (Mini-game)</label
              >
              <div class="flex items-center gap-3">
                <Button
                  variant="blue"
                  size="md"
                  onclick={() => midgardGame.rollFactoryScore()}
                >
                  Roll Score
                </Button>
                {#if midgardGame.pendingFactoryScore !== null}
                  <span class="font-ponzi-number text-2xl text-cyan-400">
                    {midgardGame.pendingFactoryScore}
                  </span>
                {:else}
                  <span class="text-gray-500">Click to roll (0-100)</span>
                {/if}
              </div>
            </div>

            <!-- Create Button -->
            <Button
              variant="blue"
              class="w-full"
              disabled={midgardGame.pendingFactoryScore === null ||
                parseFloat(lockAmount) <= 0 ||
                parseFloat(lockAmount) > midgardGame.playerGardBalance}
              onclick={handleCreateFactory}
            >
              Create Factory
            </Button>
          </div>
        {:else}
          <!-- Factory Stats -->
          {@const factory = getFactory(land)}
          <div class="mb-4 rounded-lg bg-black/40 p-4">
            <h3 class="mb-3 text-lg text-purple-400">Factory Stats</h3>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-400">Score:</span>
                <span class="font-ponzi-number text-cyan-400"
                  >{factory.score}</span
                >
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">Locked $GARD:</span>
                <span class="font-ponzi-number"
                  >{factory.lockedGard.toFixed(2)}</span
                >
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">Minted Supply:</span>
                <span class="font-ponzi-number text-green-400"
                  >{factory.mintedSupply.toFixed(2)}</span
                >
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">Burnt Amount:</span>
                <span class="font-ponzi-number text-red-400"
                  >{factory.burntAmount.toFixed(2)}</span
                >
              </div>
            </div>
          </div>

          <!-- Challenge Section -->
          <div class="rounded-lg bg-black/40 p-4">
            <h3 class="mb-3 text-lg text-orange-400">Challenge Factory</h3>

            <!-- Challenge Cost Input -->
            <div class="mb-4">
              <label class="mb-1 block text-sm text-gray-400"
                >Challenge Cost ($GARD)</label
              >
              <Input
                type="number"
                bind:value={challengeCost}
                placeholder="Enter cost"
                class="bg-black/50"
              />
            </div>

            <!-- Roll Challenge Score -->
            <div class="mb-4">
              <label class="mb-1 block text-sm text-gray-400">Your Score</label>
              <div class="flex items-center gap-3">
                <Button
                  variant="blue"
                  size="md"
                  onclick={() => midgardGame.rollChallengeScore()}
                >
                  Roll Score
                </Button>
                {#if midgardGame.challengeScore !== null}
                  <span class="font-ponzi-number text-2xl text-cyan-400">
                    {midgardGame.challengeScore}
                  </span>
                  <span class="text-gray-500">vs</span>
                  <span class="font-ponzi-number text-2xl text-purple-400">
                    {factory.score}
                  </span>
                {:else}
                  <span class="text-gray-500">Click to roll</span>
                {/if}
              </div>
            </div>

            <!-- Challenge Button -->
            <Button
              variant="red"
              class="w-full"
              disabled={midgardGame.challengeScore === null ||
                parseFloat(challengeCost) <= 0 ||
                parseFloat(challengeCost) > midgardGame.playerGardBalance}
              onclick={handleChallenge}
            >
              Challenge!
            </Button>

            <!-- Last Result -->
            {#if midgardGame.lastChallengeResult}
              {@const result = midgardGame.lastChallengeResult}
              <div
                class={[
                  'mt-4 rounded-lg p-3 text-center',
                  {
                    'bg-green-500/20': result.won,
                    'bg-red-500/20': !result.won,
                  },
                ]}
              >
                <div class="text-lg font-bold">
                  {result.won ? 'YOU WON!' : 'YOU LOST'}
                </div>
                <div class="text-sm">
                  Your score: {result.playerScore} vs Factory: {result.factoryScore}
                </div>
                <div
                  class={[
                    'font-ponzi-number text-lg',
                    {
                      'text-green-400': result.won,
                      'text-red-400': !result.won,
                    },
                  ]}
                >
                  {result.won ? '+' : ''}{result.gardChange.toFixed(2)} $GARD
                </div>
              </div>
            {/if}
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
    <h3 class="mb-2 font-bold text-white">How to Play</h3>
    <ul class="list-inside list-disc space-y-1">
      <li>
        Press <strong>Play</strong> to start time - stakes will decrease on all lands
      </li>
      <li>
        Select a land and <strong>create a factory</strong> by locking $GARD and rolling
        a score
      </li>
      <li>
        Factories <strong>mint $GARD</strong> over time (2%/tick) while burning locked
        tokens (1.5%/tick)
      </li>
      <li>
        <strong>Challenge</strong> a factory: roll higher than its score to win 2x
        your cost + 50% of its minted supply
      </li>
      <li>
        If you lose, your cost is burned and the factory recovers some burnt
        tokens
      </li>
    </ul>
  </div>
</div>
