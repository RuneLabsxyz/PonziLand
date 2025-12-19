<script lang="ts">
  import type { BaseLand } from '../types';
  import type { Factory } from '../api-client';

  interface Props {
    land: BaseLand;
    factory?: Factory | null;
    selected?: boolean;
    onclick?: () => void;
  }

  let { land, factory = null, selected = false, onclick }: Props = $props();

  function getStatusIndicator(
    factory: Factory | null,
  ): { label: string; color: string } | null {
    if (!factory) return null;
    switch (factory.status) {
      case 'pending':
        return { label: 'P', color: 'bg-yellow-500' };
      case 'active':
        return { label: 'F', color: 'bg-purple-500' };
      case 'closed':
        return { label: 'X', color: 'bg-gray-500' };
      default:
        return null;
    }
  }

  const status = $derived(getStatusIndicator(factory));
</script>

<button
  type="button"
  class={[
    'relative flex h-24 w-24 flex-col items-center justify-center rounded-lg border-2 transition-all',
    {
      'border-yellow-400 bg-yellow-500/20': selected,
      'border-gray-700 bg-gray-800 hover:border-gray-500 hover:bg-gray-700':
        !selected,
    },
  ]}
  {onclick}
>
  <!-- Status Badge -->
  {#if status}
    <div
      class={[
        'absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white',
        status.color,
      ]}
    >
      {status.label}
    </div>
  {/if}

  <!-- Land ID -->
  <div class="text-xs text-gray-500">#{land.id}</div>

  <!-- Sell Price -->
  <div class="font-ponzi-number text-lg text-white">{land.sellPrice}</div>

  <!-- Stake -->
  <div class="text-xs text-gray-400">{land.stakeAmount} stake</div>
</button>
