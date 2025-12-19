<script lang="ts">
  import { midgardGame } from '$lib/midgard/game-state.svelte';
  import { hasFactory } from '$lib/midgard/types';
  import type { Land } from '$lib/midgard/types';
  import { formatTime } from '$lib/midgard/formulas';
  import { TIME_SPEEDS, LOSS_BURN_REDUCTION } from '$lib/midgard/constants';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { onDestroy } from 'svelte';

  // Chart imports
  import { LineChart } from 'layerchart';

  // Factory creation state
  let lockAmount = $state<string>('100');

  // Cleanup on destroy
  onDestroy(() => {
    midgardGame.destroy();
  });

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
    if (midgardGame.selectedLandId === null) return;
    midgardGame.challenge(midgardGame.selectedLandId);
  }

  // Derived state for selected land
  let selectedLand = $derived(midgardGame.selectedLand);
  let landHasFactory = $derived(
    selectedLand ? hasFactory(selectedLand) : false,
  );
  let factoryStats = $derived(
    selectedLand ? midgardGame.getFactoryStats(selectedLand) : null,
  );

  // Derived chart data
  let chartData = $derived(midgardGame.chartHistory);

  // Compute symmetric y-domain centered at 0
  let yDomainSymmetric = $derived.by(() => {
    if (chartData.length === 0) return [-1, 1];
    let maxAbs = 0;
    for (const d of chartData) {
      maxAbs = Math.max(
        maxAbs,
        Math.abs(d.availableInflation),
        Math.abs(d.effectiveBurn),
        Math.abs(d.effectiveNet),
      );
    }
    return [-maxAbs * 1.1, maxAbs * 1.1]; // 10% padding
  });
</script>

<div class="min-h-screen bg-[#1a1a2e] p-6 text-white stroke-white">
  <!-- Header -->
  <div class="mb-6 flex items-center justify-between">
    <div>
      <h1 class="font-ponzi-number text-3xl">MIDGARD POC</h1>
      <p class="text-sm text-gray-500">Yellow Paper Implementation</p>
    </div>
    <div class="flex items-center gap-4">
      <!-- Tycoon Balance -->
      <div class="text-right">
        <span class="text-sm text-purple-400">Tycoon</span>
        <div class="font-ponzi-number text-xl text-yellow-400">
          {midgardGame.tycoonBalance.toFixed(2)}
        </div>
      </div>
      <!-- Challenger Balance -->
      <div class="text-right">
        <span class="text-sm text-orange-400">Challenger</span>
        <div class="font-ponzi-number text-xl text-yellow-400">
          {midgardGame.challengerBalance.toFixed(2)}
        </div>
      </div>
      <a
        href="/midgard/tokenomics"
        class="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium hover:bg-blue-500"
      >
        Tokenomics
      </a>
      <Button variant="red" size="md" onclick={() => midgardGame.reset()}
        >Reset</Button
      >
    </div>
  </div>

  <!-- Quick Stats Panel -->
  <div class="mb-6 grid grid-cols-4 gap-3 rounded-lg bg-black/30 p-3 text-sm">
    <div class="rounded bg-black/40 p-2 text-center">
      <span class="text-gray-400">Total Supply</span>
      <div class="font-ponzi-number text-lg text-blue-400">
        {midgardGame.totalSupply.toFixed(2)}
      </div>
    </div>
    <div class="rounded bg-black/40 p-2 text-center">
      <span class="text-gray-400">Locked</span>
      <div class="font-ponzi-number text-lg text-yellow-400">
        {midgardGame.vaultBalance.toFixed(2)}
      </div>
    </div>
    <div class="rounded bg-black/40 p-2 text-center">
      <span class="text-gray-400">Burned</span>
      <div class="font-ponzi-number text-lg text-red-400">
        {midgardGame.burnBalance.toFixed(2)}
      </div>
    </div>
    <div class="rounded bg-black/40 p-2 text-center">
      <span class="text-gray-400">Net Inflation</span>
      <div
        class={[
          'font-ponzi-number text-lg',
          {
            'text-green-400': midgardGame.netInflation >= 0,
            'text-red-400': midgardGame.netInflation < 0,
          },
        ]}
      >
        {midgardGame.netInflation >= 0
          ? '+'
          : ''}{midgardGame.netInflation.toFixed(2)}
      </div>
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

    <!-- Time Display -->
    <div class="flex items-center gap-2">
      <span class="text-gray-400">Game Time:</span>
      <span class="font-ponzi-number text-lg"
        >{formatTime(midgardGame.simulationTime)}</span
      >
    </div>

    <!-- Speed Buttons -->
    <div class="flex items-center gap-2">
      <span class="text-gray-400">Speed:</span>
      {#each TIME_SPEEDS as speed}
        <button
          class={[
            'rounded px-3 py-1 text-sm font-bold transition-colors',
            {
              'bg-blue-500 text-white': midgardGame.timeSpeed === speed,
              'bg-gray-700 text-gray-300 hover:bg-gray-600':
                midgardGame.timeSpeed !== speed,
            },
          ]}
          onclick={() => midgardGame.setTimeSpeed(speed)}
        >
          {speed}x
        </button>
      {/each}
    </div>

    <!-- Status Indicator -->
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
                  style="width: {Math.max(0, Math.min(100, stakePercent))}%"
                ></div>
              </div>
            </div>
          </button>
        {/each}
      </div>
    </div>

    <!-- Side Panel -->
    <div class="min-w-96 flex-1">
      {#if selectedLand}
        <!-- Selected Land Info -->
        <div class="mb-4 rounded-lg bg-black/40 p-4">
          <h2 class="mb-3 text-lg">
            Selected: Land #{selectedLand.id}
            <span class="text-gray-500">
              ({selectedLand.position.row}, {selectedLand.position.col})
            </span>
          </h2>
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span class="text-gray-400">Sell Price:</span>
              <span class="font-ponzi-number ml-2"
                >${selectedLand.sellPrice}</span
              >
            </div>
            <div>
              <span class="text-gray-400">Stake:</span>
              <span
                class={['ml-2', getStakeColor(getStakePercent(selectedLand))]}
              >
                {selectedLand.stakeAmount.toFixed(2)}
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
                >Stake $GARD (locked from Tycoon)</label
              >
              <Input
                type="number"
                bind:value={lockAmount}
                placeholder="Enter amount"
                class="bg-black/50"
              />
              <p class="mt-1 text-xs text-purple-400">
                Tycoon Balance: {midgardGame.tycoonBalance.toFixed(2)} $GARD
              </p>
            </div>

            <!-- Create Button -->
            <Button
              variant="blue"
              class="w-full"
              disabled={parseFloat(lockAmount) <= 0 ||
                parseFloat(lockAmount) > midgardGame.tycoonBalance}
              onclick={handleCreateFactory}
            >
              Create Factory (Play Game)
            </Button>
            <p class="mt-2 text-center text-xs text-gray-500">
              Score determined when you create - one chance!
            </p>

            <!-- Last Factory Result -->
            {#if midgardGame.lastFactoryResult}
              <div class="mt-4 rounded-lg bg-purple-500/20 p-3 text-center">
                <div class="text-sm text-gray-400">Factory Created!</div>
                <div class="font-ponzi-number text-2xl text-cyan-400">
                  Score: {midgardGame.lastFactoryResult.score}
                </div>
              </div>
            {/if}
          </div>
        {:else if factoryStats}
          <!-- Factory Stats (Yellow Paper) -->
          <div class="mb-4 rounded-lg bg-black/40 p-4">
            <h3 class="mb-3 text-lg text-purple-400">Factory Stats</h3>

            <div class="mb-3 grid grid-cols-2 gap-3 text-sm">
              <div class="rounded bg-black/30 p-2">
                <span class="text-gray-400">Score:</span>
                <span class="font-ponzi-number ml-2 text-cyan-400"
                  >{factoryStats.score}</span
                >
              </div>
              <div class="rounded bg-black/30 p-2">
                <span class="text-gray-400">Age:</span>
                <span class="font-ponzi-number ml-2"
                  >{formatTime(factoryStats.elapsed)}</span
                >
              </div>
              <div class="rounded bg-black/30 p-2">
                <span class="text-gray-400">Staked:</span>
                <span class="font-ponzi-number ml-2"
                  >{factoryStats.stakedGard.toFixed(2)}</span
                >
              </div>
            </div>

            <!-- Yellow Paper Economics -->
            <div class="space-y-2 border-t border-gray-700 pt-3 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-400">Burn Obligation B(t):</span>
                <span class="font-ponzi-number text-red-400">
                  {factoryStats.burn.toFixed(4)}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400"
                  >Lost Challenges Burn Reductions:</span
                >
                <span class="font-ponzi-number text-yellow-400">
                  -{(factoryStats.burn - factoryStats.effectiveBurn).toFixed(4)}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">Effective Burn Beff:</span>
                <span class="font-ponzi-number text-orange-400">
                  {factoryStats.effectiveBurn.toFixed(4)}
                </span>
              </div>
              <div
                class="mt-2 flex justify-between border-t border-gray-700 pt-2"
              >
                <span class="text-gray-400">Inflation I(t):</span>
                <span class="font-ponzi-number text-green-400">
                  {factoryStats.inflation.toFixed(4)}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">Challenge wins paid:</span>
                <span class="font-ponzi-number text-yellow-400">
                  -{(
                    factoryStats.inflation - factoryStats.availableInflation
                  ).toFixed(4)}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">Available Inflation:</span>
                <span class="font-ponzi-number text-emerald-400">
                  {factoryStats.availableInflation.toFixed(4)}
                </span>
              </div>
              <div
                class="mt-2 flex justify-between border-t border-gray-700 pt-2"
              >
                <span class="text-gray-400">Current Net:</span>
                <span
                  class={[
                    'font-ponzi-number',
                    {
                      'text-green-400':
                        factoryStats.availableInflation -
                          factoryStats.effectiveBurn >=
                        0,
                      'text-red-400':
                        factoryStats.availableInflation -
                          factoryStats.effectiveBurn <
                        0,
                    },
                  ]}
                >
                  {factoryStats.availableInflation -
                    factoryStats.effectiveBurn >=
                  0
                    ? '+'
                    : ''}{(
                    factoryStats.availableInflation - factoryStats.effectiveBurn
                  ).toFixed(4)}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">Predicted Net Result:</span>
                <span
                  class={[
                    'font-ponzi-number',
                    {
                      'text-green-400': factoryStats.predictedNetResult >= 0,
                      'text-red-400': factoryStats.predictedNetResult < 0,
                    },
                  ]}
                >
                  {factoryStats.predictedNetResult >= 0
                    ? '+'
                    : ''}{factoryStats.predictedNetResult.toFixed(4)}
                </span>
              </div>
              <div
                class="mt-2 flex justify-between border-t border-gray-700 pt-2"
              >
                <span class="text-gray-400">Challenge Wins Value:</span>
                <span class="font-ponzi-number text-green-400">
                  +{factoryStats.totalWinsValue.toFixed(4)}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">Challenge Losses Value:</span>
                <span class="font-ponzi-number text-red-400">
                  -{factoryStats.totalLossesValue.toFixed(4)}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">Net Challenge Value:</span>
                <span
                  class={[
                    'font-ponzi-number',
                    {
                      'text-green-400': factoryStats.netChallengeValue >= 0,
                      'text-red-400': factoryStats.netChallengeValue < 0,
                    },
                  ]}
                >
                  {factoryStats.netChallengeValue >= 0
                    ? '+'
                    : ''}{factoryStats.netChallengeValue.toFixed(4)}
                </span>
              </div>
            </div>
          </div>

          <!-- Chart Visualization -->
          {#if chartData.length > 1}
            <div class="mb-4 rounded-lg bg-black/40 p-4 text-white">
              <h3 class="mb-3 text-lg text-blue-400">
                Factory Economics Over Time
              </h3>
              <div class="h-48">
                <LineChart
                  data={chartData}
                  x="time"
                  y="inflation"
                  yDomain={yDomainSymmetric}
                  series={[
                    {
                      key: 'availableInflation',
                      label: 'Eff. Inflation',
                      color: 'hsl(142 76% 36%)',
                    },
                    {
                      key: 'effectiveBurn',
                      label: 'Eff. Burn',
                      color: 'hsl(0 84% 60%)',
                      value: (d: { effectiveBurn: number }) => -d.effectiveBurn,
                    },
                    {
                      key: 'effectiveNet',
                      label: 'Eff. Net',
                      color: 'hsl(45 93% 47%)',
                    },
                  ]}
                  props={{
                    xAxis: {
                      format: (v: number) => formatTime(v),
                      class: 'text-white',
                    },
                    yAxis: {
                      format: (v: number) => v.toFixed(2),
                      class: 'text-white',
                    },
                  }}
                />
              </div>
              <div class="mt-2 flex justify-center gap-4 text-xs">
                <div class="flex items-center gap-1">
                  <div class="h-2 w-4 rounded bg-green-500"></div>
                  <span class="text-gray-400">Eff. Inflation</span>
                </div>
                <div class="flex items-center gap-1">
                  <div class="h-2 w-4 rounded bg-red-500"></div>
                  <span class="text-gray-400">Eff. Burn</span>
                </div>
                <div class="flex items-center gap-1">
                  <div class="h-2 w-4 rounded bg-yellow-500"></div>
                  <span class="text-gray-400">Eff. Net</span>
                </div>
              </div>
            </div>
          {/if}

          <!-- Challenge Section -->
          <div class="rounded-lg bg-black/40 p-4">
            <h3 class="mb-3 text-lg text-orange-400">Challenge Factory</h3>

            <!-- Challenge Economics -->
            <div class="mb-4 space-y-2 text-sm">
              <div class="flex justify-between rounded bg-black/30 p-2">
                <span class="text-gray-400">Ticket Cost (α × Beff):</span>
                <span class="font-ponzi-number text-yellow-400">
                  {factoryStats.ticketCost.toFixed(4)} $GARD
                </span>
              </div>
              <div class="flex justify-between rounded bg-black/30 p-2">
                <span class="text-gray-400">Win Reward (γ × Ticket):</span>
                <span class="font-ponzi-number text-green-400">
                  {factoryStats.potentialWinReward.toFixed(4)} $GARD
                </span>
              </div>
              <div class="flex justify-between rounded bg-black/30 p-2">
                <span class="text-gray-400">Liquidity Check:</span>
                {#if factoryStats.challengeAllowed}
                  <span class="text-green-400">✓ Allowed</span>
                {:else}
                  <span class="text-red-400">✗ Insufficient inflation</span>
                {/if}
              </div>
            </div>

            <!-- Challenge Info -->
            <div class="mb-4 rounded bg-black/30 p-3">
              <div class="flex items-center justify-between">
                <span class="text-gray-400">Factory Score to Beat:</span>
                <span class="font-ponzi-number text-2xl text-purple-400">
                  {factoryStats.score}
                </span>
              </div>
              <div class="mt-2 flex items-center justify-between text-sm">
                <span class="text-gray-400">Challenger Balance:</span>
                <span class="font-ponzi-number text-orange-400">
                  {midgardGame.challengerBalance.toFixed(2)} $GARD
                </span>
              </div>
            </div>

            <!-- Challenge Button -->
            <Button
              variant="red"
              class="w-full"
              disabled={!factoryStats.challengeAllowed ||
                midgardGame.challengerBalance < factoryStats.ticketCost}
              onclick={handleChallenge}
            >
              Challenge! (Cost: {factoryStats.ticketCost.toFixed(4)} $GARD)
            </Button>
            <p class="mt-2 text-center text-xs text-gray-500">
              Score determined when you challenge - one chance!
            </p>

            {#if !factoryStats.challengeAllowed}
              <p class="mt-2 text-center text-xs text-red-400">
                Factory needs more inflation to pay potential winners
              </p>
            {:else if midgardGame.challengerBalance < factoryStats.ticketCost}
              <p class="mt-2 text-center text-xs text-red-400">
                Insufficient Challenger balance
              </p>
            {/if}

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
                  {result.won ? '+' : ''}{result.gardChange.toFixed(4)} $GARD
                </div>
                {#if !result.won}
                  <div class="mt-1 text-xs text-gray-400">
                    Factory burn reduced by {(
                      result.ticketCost * LOSS_BURN_REDUCTION
                    ).toFixed(4)} (β={LOSS_BURN_REDUCTION * 100}%)
                  </div>
                {/if}
              </div>
            {/if}

            <!-- Challenge History Table -->
            {#if midgardGame.challengeHistory.length > 0}
              <div class="mt-4 border-t border-gray-700 pt-4">
                <h4 class="mb-2 text-sm text-gray-400">Challenge History</h4>
                <div class="max-h-32 overflow-y-auto">
                  <table class="w-full text-xs">
                    <thead class="sticky top-0 bg-black/60">
                      <tr class="text-gray-500">
                        <th class="py-1 text-left">Time</th>
                        <th class="py-1 text-right">Ticket</th>
                        <th class="py-1 text-right">Reward</th>
                        <th class="py-1 text-center">Score</th>
                        <th class="py-1 text-right">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {#each [...midgardGame.challengeHistory].reverse() as record}
                        <tr class="border-t border-gray-800">
                          <td class="py-1 font-ponzi-number"
                            >{formatTime(record.time)}</td
                          >
                          <td class="py-1 text-right font-ponzi-number"
                            >{record.ticketCost.toFixed(2)}</td
                          >
                          <td class="py-1 text-right font-ponzi-number"
                            >{record.potentialReward.toFixed(2)}</td
                          >
                          <td class="py-1 text-center">
                            <span class="font-ponzi-number"
                              >{record.playerScore}</span
                            >
                            <span class="text-gray-500">vs</span>
                            <span class="font-ponzi-number"
                              >{record.factoryScore}</span
                            >
                          </td>
                          <td
                            class={[
                              'py-1 text-right font-ponzi-number',
                              {
                                'text-green-400': record.won,
                                'text-red-400': !record.won,
                              },
                            ]}
                          >
                            {record.won ? '+' : ''}{record.netResult.toFixed(2)}
                          </td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
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

  <!-- Instructions (Yellow Paper Summary) -->
  <div class="mt-6 rounded-lg bg-black/20 p-4 text-sm text-gray-400">
    <h3 class="mb-2 font-bold text-white">Yellow Paper Mechanics</h3>
    <div class="grid grid-cols-2 gap-4">
      <div>
        <h4 class="mb-1 font-semibold text-purple-400">Factory Economics</h4>
        <ul class="list-inside list-disc space-y-1">
          <li>
            <strong>Burn:</strong> B(t) = r × t (linear with time)
          </li>
          <li>
            <strong>Inflation:</strong> I(t) = r × t × (1 + m × (1 - e<sup
              >-t/A</sup
            >))
          </li>
          <li>Inflation always ≥ Burn (bonus factor ≥ 1)</li>
          <li>Failed challenges reduce burn obligation</li>
        </ul>
      </div>
      <div>
        <h4 class="mb-1 font-semibold text-orange-400">Challenge System</h4>
        <ul class="list-inside list-disc space-y-1">
          <li>
            <strong>Ticket Cost:</strong> α × Beff (10% of effective burn)
          </li>
          <li>
            <strong>Win:</strong> Earn γ × Ticket (190%) from inflation
          </li>
          <li>
            <strong>Lose:</strong> Ticket burned, β (90%) reduces factory burn
          </li>
          <li>
            <strong>Constraint:</strong> Available inflation ≥ γ × Ticket
          </li>
        </ul>
      </div>
    </div>
  </div>

  <!-- Closed Factories History -->
  {#if midgardGame.closedFactoryHistory.length > 0}
    <div class="mt-6 rounded-lg bg-black/40 p-4">
      <h3 class="mb-3 text-lg text-red-400">Closed Factories</h3>
      <div class="max-h-48 overflow-y-auto">
        <table class="w-full text-sm">
          <thead class="sticky top-0 bg-black/60">
            <tr class="text-gray-500">
              <th class="py-2 text-left">Land</th>
              <th class="py-2 text-right">Duration</th>
              <th class="py-2 text-right">Stake</th>
              <th class="py-2 text-right">Final Burn</th>
              <th class="py-2 text-right">Final Inflation</th>
              <th class="py-2 text-right">Net Result</th>
              <th class="py-2 text-right">Challenges</th>
              <th class="py-2 text-right">Score</th>
            </tr>
          </thead>
          <tbody>
            {#each [...midgardGame.closedFactoryHistory].reverse() as record}
              {@const netResult = record.finalInflation - record.finalBurn}
              <tr class="border-t border-gray-800">
                <td class="py-2">#{record.landId}</td>
                <td class="py-2 text-right font-ponzi-number"
                  >{formatTime(record.duration)}</td
                >
                <td class="py-2 text-right font-ponzi-number text-yellow-400"
                  >{record.stakedGard.toFixed(2)}</td
                >
                <td class="py-2 text-right font-ponzi-number text-red-400"
                  >{record.finalBurn.toFixed(2)}</td
                >
                <td class="py-2 text-right font-ponzi-number text-green-400"
                  >{record.finalInflation.toFixed(2)}</td
                >
                <td
                  class={[
                    'py-2 text-right font-ponzi-number',
                    {
                      'text-green-400': netResult >= 0,
                      'text-red-400': netResult < 0,
                    },
                  ]}
                >
                  {netResult >= 0 ? '+' : ''}{netResult.toFixed(2)}
                </td>
                <td class="py-2 text-right font-ponzi-number">
                  {record.totalChallenges}
                  <span class="text-xs"
                    >(<span class="text-green-400">{record.wins}W</span>/<span
                      class="text-red-400">{record.losses}L</span
                    >)</span
                  >
                </td>
                <td class="py-2 text-right font-ponzi-number text-cyan-400"
                  >{record.score}</td
                >
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>
