<script lang="ts">
  import type { OwnedLand } from '$lib/midgard/ponzi-land-store.svelte';
  import type { Factory } from '../api-client';
  import { getTokenInfo } from '$lib/utils';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';

  interface Props {
    land: OwnedLand;
    factory?: Factory | null;
    selected?: boolean;
    onclick?: () => void;
  }

  let { land, factory = null, selected = false, onclick }: Props = $props();

  // Get token info for display
  const token = $derived(getTokenInfo(land.tokenUsed));
  const sellPriceFormatted = $derived(
    token ? CurrencyAmount.fromUnscaled(land.sellPrice, token).toString() : '0',
  );
  const stakeFormatted = $derived(
    token
      ? CurrencyAmount.fromUnscaled(land.stakeAmount, token).toString()
      : '0',
  );
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
    <div class="flex items-center gap-2">
      <span class="font-ponzi-number text-lg text-white">
        #{land.location}
      </span>
      <span class="text-xs text-gray-500">
        ({land.coordinates.x}, {land.coordinates.y})
      </span>
    </div>
    {#if factory}
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
    {:else}
      <span class="rounded bg-gray-600/20 px-2 py-0.5 text-xs text-gray-500">
        No Factory
      </span>
    {/if}
  </div>

  <!-- Main Info -->
  <div class="grid grid-cols-2 gap-2 text-sm">
    <div>
      <span class="text-gray-500">Token:</span>
      <span class="ml-1 text-white">
        {token?.symbol ?? 'Unknown'}
      </span>
    </div>
    <div>
      <span class="text-gray-500">Level:</span>
      <span class="font-ponzi-number ml-1 text-cyan-400">
        {land.level}
      </span>
    </div>
    <div>
      <span class="text-gray-500">Price:</span>
      <span class="font-ponzi-number ml-1 text-green-400">
        {sellPriceFormatted}
      </span>
    </div>
    <div>
      <span class="text-gray-500">Stake:</span>
      <span class="font-ponzi-number ml-1 text-purple-400">
        {stakeFormatted}
      </span>
    </div>
  </div>

  <!-- Factory Info (if available) -->
  {#if factory}
    <div class="mt-3 border-t border-gray-700 pt-3">
      <div class="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span class="text-gray-500">Score:</span>
          <span class="font-ponzi-number ml-1 text-cyan-400">
            {factory.score ?? '-'}
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
    </div>
  {/if}
</button>
