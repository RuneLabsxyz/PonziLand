<script lang="ts">
  import type { FactoryStats } from '../api-client';
  import { formatTime } from '../formulas';

  interface Props {
    stats: FactoryStats;
  }

  let { stats }: Props = $props();
</script>

<div class="space-y-3">
  <h4 class="text-sm font-semibold text-gray-400">Economics</h4>

  <div class="grid grid-cols-2 gap-2 text-sm">
    <!-- Elapsed Time -->
    <div class="rounded bg-gray-800/50 p-2">
      <div class="text-xs text-gray-500">Age</div>
      <div class="font-ponzi-number text-cyan-400">
        {formatTime(stats.elapsedSeconds)}
      </div>
    </div>

    <!-- Time to Close -->
    <div class="rounded bg-gray-800/50 p-2">
      <div class="text-xs text-gray-500">Time to Close</div>
      <div class="font-ponzi-number text-orange-400">
        {formatTime(stats.timeToClose)}
      </div>
    </div>

    <!-- Burn -->
    <div class="rounded bg-gray-800/50 p-2">
      <div class="text-xs text-gray-500">Burn B(t)</div>
      <div class="font-ponzi-number text-red-400">
        {stats.burn.toFixed(4)}
      </div>
    </div>

    <!-- Effective Burn -->
    <div class="rounded bg-gray-800/50 p-2">
      <div class="text-xs text-gray-500">Effective Burn</div>
      <div class="font-ponzi-number text-red-300">
        {stats.effectiveBurn.toFixed(4)}
      </div>
    </div>

    <!-- Inflation -->
    <div class="rounded bg-gray-800/50 p-2">
      <div class="text-xs text-gray-500">Inflation I(t)</div>
      <div class="font-ponzi-number text-green-400">
        {stats.inflation.toFixed(4)}
      </div>
    </div>

    <!-- Available Inflation -->
    <div class="rounded bg-gray-800/50 p-2">
      <div class="text-xs text-gray-500">Available Inflation</div>
      <div class="font-ponzi-number text-green-300">
        {stats.availableInflation.toFixed(4)}
      </div>
    </div>

    <!-- Ticket Cost -->
    <div class="rounded bg-gray-800/50 p-2">
      <div class="text-xs text-gray-500">Ticket Cost</div>
      <div class="font-ponzi-number text-yellow-400">
        {stats.ticketCost.toFixed(4)}
      </div>
    </div>

    <!-- Win Reward -->
    <div class="rounded bg-gray-800/50 p-2">
      <div class="text-xs text-gray-500">Win Reward</div>
      <div class="font-ponzi-number text-purple-400">
        {stats.potentialReward.toFixed(4)}
      </div>
    </div>
  </div>

  <!-- Predicted Net Result -->
  <div class="rounded bg-gray-800/50 p-2">
    <div class="text-xs text-gray-500">Predicted Net Result</div>
    <div
      class={[
        'font-ponzi-number text-lg',
        {
          'text-green-400': stats.predictedNetResult >= 0,
          'text-red-400': stats.predictedNetResult < 0,
        },
      ]}
    >
      {stats.predictedNetResult >= 0
        ? '+'
        : ''}{stats.predictedNetResult.toFixed(4)}
    </div>
  </div>

  <!-- Challenge Status -->
  <div
    class={[
      'rounded p-2 text-center text-sm font-medium',
      {
        'bg-green-500/20 text-green-400': stats.challengeAllowed,
        'bg-red-500/20 text-red-400': !stats.challengeAllowed,
      },
    ]}
  >
    {stats.challengeAllowed
      ? 'Challenge Allowed'
      : 'Challenge Not Allowed (Insufficient Inflation)'}
  </div>
</div>
