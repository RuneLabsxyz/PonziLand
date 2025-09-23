<script lang="ts">
  import TokenAvatar from '$lib/components/ui/token-avatar/token-avatar.svelte';
  import type { Token } from '$lib/interfaces';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { ChevronDown } from 'lucide-svelte';

  let {
    paybackTimeString,
    paybackTimeSeconds,
    currentBuyPrice,
    landToken,
    baseToken,
    selectedToken,
    nbNeighbors,
    netYieldPerHour,
    yieldPerNeighbor,
  }: {
    paybackTimeString: string;
    paybackTimeSeconds: number;
    currentBuyPrice?: CurrencyAmount;
    landToken?: Token;
    baseToken?: Token;
    selectedToken?: Token;
    nbNeighbors: number;
    netYieldPerHour?: CurrencyAmount;
    yieldPerNeighbor?: CurrencyAmount;
  } = $props();

  let isExpanded = $state(false);

  function toggleExpanded() {
    isExpanded = !isExpanded;
  }
</script>

<div class="bg-slate-800/30 border border-slate-600/30 rounded text-xs">
  <!-- Collapsed Header - Always Visible -->
  <button
    onclick={toggleExpanded}
    class="w-full flex justify-between items-center p-2 hover:bg-slate-700/20 transition-colors"
  >
    <div class="flex items-center gap-2">
      <span class="font-semibold text-yellow-400">Payback Time:</span>
      <div
        class="{paybackTimeSeconds === Infinity
          ? 'text-red-500'
          : paybackTimeSeconds < 3600 * 24 * 7
            ? 'text-green-500'
            : 'text-yellow-500'} font-semibold"
      >
        {paybackTimeString}
      </div>
    </div>

    <div
      class="transition-transform duration-200"
      class:rotate-180={isExpanded}
    >
      <ChevronDown size={16} class="text-slate-400" />
    </div>
  </button>

  <!-- Expanded Details -->
  {#if isExpanded}
    <div class="px-2 pb-2 space-y-1 border-t border-slate-600/30">
      <!-- Land Purchase Cost -->
      {#if currentBuyPrice && landToken}
        <div
          class="flex justify-between select-text leading-none items-end pt-1"
        >
          <span class="opacity-75">Land cost:</span>
          <div class="flex items-center gap-1 text-orange-400">
            <span>{currentBuyPrice.toString()} {landToken.symbol}</span>
            <TokenAvatar
              token={landToken}
              class="border border-white w-3 h-3"
            />
          </div>
        </div>
      {/if}

      {#if yieldPerNeighbor && netYieldPerHour && selectedToken && baseToken}
        <!-- Yield Calculation -->
        <div class="space-y-1">
          <div class="flex justify-between select-text leading-none items-end">
            <span class="opacity-75">Yield per neighbor:</span>
            <div class="flex items-center gap-1 text-green-400">
              <span>+{yieldPerNeighbor.toString()} {baseToken.symbol}/h</span>
              <TokenAvatar
                token={baseToken}
                class="border border-white w-3 h-3"
              />
            </div>
          </div>

          <div class="flex justify-between select-text leading-none items-end">
            <span class="opacity-75"
              >× <span class="text-orange-400">{nbNeighbors}</span> neighbors:</span
            >
            <div class="flex items-center gap-1 text-green-400">
              <span>+{netYieldPerHour.toString()} {baseToken.symbol}/h</span>
              <TokenAvatar
                token={baseToken}
                class="border border-white w-3 h-3"
              />
            </div>
          </div>
        </div>
      {/if}

      <!-- Payback Explanation -->
      {#if paybackTimeSeconds === Infinity}
        <div
          class="bg-red-900/20 border border-red-600/30 rounded p-2 text-red-300 text-xs mt-2"
        >
          ⚠️ No payback: Land is losing money (negative yield)
        </div>
      {:else if paybackTimeSeconds === 0}
        <div
          class="bg-yellow-900/20 border border-yellow-600/30 rounded p-2 text-yellow-300 text-xs mt-2"
        >
          ⚠️ No yield generated from neighbors
        </div>
      {:else if paybackTimeSeconds < 3600 * 24 * 7}
        <div
          class="bg-green-900/20 border border-green-600/30 rounded p-2 text-green-300 text-xs mt-2"
        >
          ✅ Excellent: Land will pay for itself within a week!
        </div>
      {:else if paybackTimeSeconds < 3600 * 24 * 30}
        <div
          class="bg-blue-900/20 border border-blue-600/30 rounded p-2 text-blue-300 text-xs mt-2"
        >
          💡 Good: Land will pay for itself within a month
        </div>
      {:else}
        <div
          class="bg-yellow-900/20 border border-yellow-600/30 rounded p-2 text-yellow-300 text-xs mt-2"
        >
          ⏰ Long payback: Consider the time investment carefully
        </div>
      {/if}
    </div>
  {/if}
</div>
