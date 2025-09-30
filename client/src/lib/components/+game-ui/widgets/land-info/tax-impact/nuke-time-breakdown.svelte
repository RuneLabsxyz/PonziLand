<script lang="ts">
  import TokenAvatar from '$lib/components/ui/token-avatar/token-avatar.svelte';
  import type { Token } from '$lib/interfaces';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { ChevronDown } from 'lucide-svelte';
  import InfoTooltip from '$lib/components/ui/info-tooltip.svelte';

  let {
    nukeTimeString,
    nukeTimeSeconds,
    stakeAmount,
    selectedToken,
    baseToken,
    nbNeighbors,
    hourlyCost,
    hourlyCostInBaseToken,
    taxPerNeighbor,
  }: {
    nukeTimeString: string;
    nukeTimeSeconds: number;
    stakeAmount?: CurrencyAmount;
    selectedToken?: Token;
    baseToken?: Token;
    nbNeighbors: number;
    hourlyCost?: CurrencyAmount;
    hourlyCostInBaseToken?: CurrencyAmount;
    taxPerNeighbor?: CurrencyAmount;
  } = $props();

  let isExpanded = $state(false);

  function toggleExpanded() {
    isExpanded = !isExpanded;
  }
</script>

<div class="bg-slate-800/30 border border-slate-600/30 rounded text-md">
  <!-- Collapsed Header - Always Visible -->
  <button
    onclick={toggleExpanded}
    class="w-full flex items-center p-3 hover:bg-slate-700/20 transition-colors"
  >
    <div class="flex flex-1 items-center gap-3">
      <span class="font-semibold font-ponzi-number opacity-75 tracking-wider">
        Nuke Time
      </span>
      <InfoTooltip
        text="Time until your staked tokens run out due to tax payments (you can always stake more later)"
      />
    </div>

    <div
      class="{nukeTimeString.includes('Now') || nukeTimeSeconds < 3600
        ? 'text-red-500'
        : 'text-green-500'} font-ponzi-number font-bold text-lg"
    >
      {nukeTimeString}
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
    <div class="px-3 pb-3 space-y-1 border-t border-slate-600/30">
      <!-- Current Stake -->
      {#if stakeAmount && selectedToken}
        <div class="flex justify-between select-text leading-none items-end">
          <div class="flex items-center gap-1">
            <span class="opacity-75">Current stake:</span>
            <InfoTooltip
              text="The amount of tokens currently staked in this land"
            />
          </div>
          <div class="flex items-center gap-1 text-blue-400">
            <span>{stakeAmount.toString()} {selectedToken.symbol}</span>
            <TokenAvatar
              token={selectedToken}
              class="border border-white w-3 h-3"
            />
          </div>
        </div>
      {/if}

      {#if taxPerNeighbor && hourlyCost && selectedToken}
        <div class="flex justify-between select-text leading-none items-end">
          <div class="flex items-center gap-1">
            <span class="opacity-75">Rate per neighbor:</span>
            <InfoTooltip
              text="Tax amount paid per hour to each neighboring land owner"
            />
          </div>
          <div class="flex items-center gap-1 text-purple-400">
            <span>{taxPerNeighbor.toString()} {selectedToken.symbol}/h</span>
            <TokenAvatar
              token={selectedToken}
              class="border border-white w-3 h-3"
            />
          </div>
        </div>

        <div class="flex justify-between select-text leading-none items-end">
          <div class="flex items-center gap-1">
            <span class="opacity-75"
              >× <span class="text-orange-400">{nbNeighbors}</span> neighbors:</span
            >
            <InfoTooltip
              text="Total hourly tax cost for the selected number of neighbors"
            />
          </div>
          <div class="flex items-center gap-1 text-red-400">
            <span>-{hourlyCost.toString()} {selectedToken.symbol}/h</span>
            <TokenAvatar
              token={selectedToken}
              class="border border-white w-3 h-3"
            />
          </div>
        </div>

        {#if hourlyCostInBaseToken && baseToken}
          <div
            class="flex justify-between select-text leading-none items-end text-red-400 opacity-75"
          >
            <span class="opacity-75">≈ Total cost:</span>
            <div class="flex items-center gap-1">
              <span
                >-{hourlyCostInBaseToken.toString()}
                {baseToken.symbol}/h</span
              >
              <TokenAvatar
                token={baseToken}
                class="border border-white w-2 h-2"
              />
            </div>
          </div>
        {/if}
      {/if}
    </div>
  {/if}
</div>
