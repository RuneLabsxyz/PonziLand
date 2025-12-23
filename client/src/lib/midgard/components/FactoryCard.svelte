<script lang="ts">
  import type { Factory, FactoryStats } from '../api-client';
  import { formatTime } from '../formulas';

  interface Props {
    factory: Factory;
    stats?: FactoryStats | null;
    selected?: boolean;
    onclick?: () => void;
  }

  let { factory, stats = null, selected = false, onclick }: Props = $props();
</script>

<button
  type="button"
  class={[
    'w-full rounded-lg border-2 p-4 text-left transition-all',
    {
      'border-purple-400 bg-purple-500/20': selected,
      'border-gray-700 bg-gray-800 hover:border-gray-500': !selected,
    },
  ]}
  {onclick}
>
  <!-- Header -->
  <div class="mb-2 flex items-center justify-between">
    <div class="font-mono text-sm text-gray-400">
      {factory.id.slice(0, 8)}...
    </div>
    <span
      class={[
        'rounded px-2 py-0.5 text-xs font-medium',
        {
          'bg-yellow-500/20 text-yellow-400': factory.status === 'pending',
          'bg-purple-500/20 text-purple-400': factory.status === 'active',
          'bg-gray-500/20 text-gray-400': factory.status === 'closed',
        },
      ]}
    >
      {factory.status}
    </span>
  </div>

  <!-- Main Info -->
  <div class="grid grid-cols-2 gap-2 text-sm">
    <div>
      <span class="text-gray-500">Land:</span>
      <span class="font-ponzi-number ml-1 text-white">#{factory.landId}</span>
    </div>
    <div>
      <span class="text-gray-500">Score:</span>
      <span class="font-ponzi-number ml-1 text-cyan-400">
        {factory.score ?? '-'}
      </span>
    </div>
    <div>
      <span class="text-gray-500">Staked:</span>
      <span class="font-ponzi-number ml-1 text-purple-400">
        {factory.stakedGard}
      </span>
    </div>
    <div>
      <span class="text-gray-500">W/L:</span>
      <span class="font-ponzi-number ml-1 text-green-400">
        {factory.challengeWins}
      </span>
      <span class="text-gray-500">/</span>
      <span class="font-ponzi-number text-red-400">
        {factory.challengeLosses}
      </span>
    </div>
  </div>

  <!-- Stats (if available) -->
  {#if stats}
    <div class="mt-3 border-t border-gray-700 pt-3">
      <div class="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span class="text-gray-500">Age:</span>
          <span class="font-ponzi-number ml-1 text-gray-300">
            {formatTime(stats.elapsedSeconds)}
          </span>
        </div>
        <div>
          <span class="text-gray-500">Ticket:</span>
          <span class="font-ponzi-number ml-1 text-yellow-400">
            {stats.ticketCost.toFixed(2)}
          </span>
        </div>
      </div>
      <div
        class={[
          'mt-2 rounded px-2 py-1 text-center text-xs font-medium',
          {
            'bg-green-500/20 text-green-400': stats.challengeAllowed,
            'bg-red-500/20 text-red-400': !stats.challengeAllowed,
          },
        ]}
      >
        {stats.challengeAllowed ? 'Challenge Available' : 'No Challenge'}
      </div>
    </div>
  {/if}
</button>
