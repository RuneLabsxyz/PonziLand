<script lang="ts">
  import { midgardAPI } from '../api-store.svelte';
  import { Button } from '$lib/components/ui/button';
  import FlappyGameModal from './game/FlappyGameModal.svelte';

  interface Props {
    factoryId?: string;
    ticketCost: number;
    potentialReward: number;
    challengeAllowed: boolean;
  }

  let { factoryId, ticketCost, potentialReward, challengeAllowed }: Props =
    $props();

  let showChallengeGame = $state(false);

  async function handleCreateChallenge() {
    try {
      await midgardAPI.createChallenge(factoryId);
    } catch (e) {
      console.error('Failed to create challenge:', e);
    }
  }

  function openChallengeGame() {
    showChallengeGame = true;
  }

  async function handleCompleteWithScore(score: number) {
    showChallengeGame = false;
    try {
      await midgardAPI.completeChallenge(score);
    } catch (e) {
      console.error('Failed to complete challenge:', e);
    }
  }
</script>

<div class="space-y-4">
  <h4 class="text-sm font-semibold text-orange-400">Challenge</h4>

  {#if midgardAPI.pendingChallenge}
    <!-- Pending Challenge: Play Game -->
    <div class="rounded-lg bg-orange-500/10 p-4">
      <div class="mb-3 text-center text-sm text-orange-400">
        Challenge in Progress!
      </div>
      <div class="mb-3 grid grid-cols-2 gap-2 text-sm">
        <div class="rounded bg-gray-800/50 p-2 text-center">
          <div class="text-xs text-gray-500">Ticket Burned</div>
          <div class="font-ponzi-number text-yellow-400">
            {midgardAPI.pendingChallenge.ticketCost.toFixed(4)}
          </div>
        </div>
        <div class="rounded bg-gray-800/50 p-2 text-center">
          <div class="text-xs text-gray-500">Potential Win</div>
          <div class="font-ponzi-number text-green-400">
            {midgardAPI.pendingChallenge.potentialReward.toFixed(4)}
          </div>
        </div>
      </div>
      <Button
        variant="blue"
        class="w-full bg-orange-600 hover:bg-orange-500"
        disabled={midgardAPI.isLoading}
        onclick={openChallengeGame}
      >
        {midgardAPI.isLoading ? 'Submitting...' : 'Play Challenge Game'}
      </Button>
      <p class="mt-2 text-center text-xs text-gray-500">
        Ticket was burned. Play to set your score!
      </p>
    </div>
  {:else if midgardAPI.lastChallengeResult}
    <!-- Show Last Result -->
    <div
      class={[
        'rounded-lg p-4 text-center',
        {
          'bg-green-500/20': midgardAPI.lastChallengeResult.won,
          'bg-red-500/20': !midgardAPI.lastChallengeResult.won,
        },
      ]}
    >
      <div
        class={[
          'mb-2 text-lg font-bold',
          {
            'text-green-400': midgardAPI.lastChallengeResult.won,
            'text-red-400': !midgardAPI.lastChallengeResult.won,
          },
        ]}
      >
        {midgardAPI.lastChallengeResult.won ? 'YOU WON!' : 'YOU LOST'}
      </div>
      <div class="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span class="text-gray-500">Your Score:</span>
          <span class="font-ponzi-number ml-1 text-cyan-400">
            {midgardAPI.lastChallengeResult.playerScore}
          </span>
        </div>
        <div>
          <span class="text-gray-500">Factory:</span>
          <span class="font-ponzi-number ml-1 text-purple-400">
            {midgardAPI.lastChallengeResult.factoryScore}
          </span>
        </div>
      </div>
      <div class="mt-2">
        <span class="text-gray-500">Result:</span>
        <span
          class={[
            'font-ponzi-number ml-1',
            {
              'text-green-400':
                (midgardAPI.lastChallengeResult.gardChange ?? 0) >= 0,
              'text-red-400':
                (midgardAPI.lastChallengeResult.gardChange ?? 0) < 0,
            },
          ]}
        >
          {(midgardAPI.lastChallengeResult.gardChange ?? 0) >= 0 ? '+' : ''}
          {(midgardAPI.lastChallengeResult.gardChange ?? 0).toFixed(4)} GARD
        </span>
      </div>
      <Button
        variant="blue"
        size="sm"
        class="mt-3"
        onclick={() => midgardAPI.clearLastResult()}
      >
        Continue
      </Button>
    </div>
  {:else}
    <!-- Create Challenge -->
    <div class="space-y-3">
      <div class="grid grid-cols-2 gap-2 text-sm">
        <div class="rounded bg-gray-800/50 p-2 text-center">
          <div class="text-xs text-gray-500">Ticket Cost</div>
          <div class="font-ponzi-number text-yellow-400">
            {ticketCost.toFixed(4)} GARD
          </div>
        </div>
        <div class="rounded bg-gray-800/50 p-2 text-center">
          <div class="text-xs text-gray-500">Win Reward</div>
          <div class="font-ponzi-number text-green-400">
            {potentialReward.toFixed(4)} GARD
          </div>
        </div>
      </div>

      <Button
        variant="blue"
        class="w-full bg-orange-600 hover:bg-orange-500"
        disabled={midgardAPI.isLoading ||
          !challengeAllowed ||
          midgardAPI.walletBalance < ticketCost}
        onclick={handleCreateChallenge}
      >
        {#if midgardAPI.isLoading}
          Creating Challenge...
        {:else if !challengeAllowed}
          Insufficient Inflation
        {:else if midgardAPI.walletBalance < ticketCost}
          Insufficient Balance
        {:else}
          Challenge Factory
        {/if}
      </Button>

      {#if midgardAPI.walletBalance < ticketCost}
        <p class="text-center text-xs text-red-400">
          Need {ticketCost.toFixed(4)} GARD, have {midgardAPI.walletBalance.toFixed(
            2,
          )} GARD
        </p>
      {/if}
    </div>
  {/if}
</div>

<!-- Game Modal for Challenge -->
<FlappyGameModal
  visible={showChallengeGame}
  title="Challenge Game"
  onClose={() => (showChallengeGame = false)}
  onScoreSubmit={handleCompleteWithScore}
/>
