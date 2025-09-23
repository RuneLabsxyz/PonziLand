<script lang="ts">
  import TokenAvatar from '$lib/components/ui/token-avatar/token-avatar.svelte';
  import type { Token } from '$lib/interfaces';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { ChevronDown } from 'lucide-svelte';
  import InfoTooltip from '$lib/components/ui/info-tooltip.svelte';

  let {
    paybackTimeString,
    paybackTimeSeconds,
    currentBuyPrice,
    landToken,
    baseToken,
    nbNeighbors,
    netYieldPerHour,
    currentBuyPriceInBaseToken,
    grossYieldPerHour,
    hourlyCostInBaseToken,
  }: {
    paybackTimeString: string;
    paybackTimeSeconds: number;
    currentBuyPrice?: CurrencyAmount;
    landToken?: Token;
    baseToken?: Token;
    nbNeighbors: number;
    netYieldPerHour?: CurrencyAmount;
    currentBuyPriceInBaseToken?: CurrencyAmount;
    grossYieldPerHour?: CurrencyAmount;
    hourlyCostInBaseToken?: CurrencyAmount;
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
      <span class="font-semibold font-ponzi-number opacity-75 tracking-wider"
        >Payback Time</span
      >
    </div>

    <div
      class="{paybackTimeSeconds === Infinity
        ? 'text-red-500'
        : paybackTimeSeconds < 3600 * 24 * 7
          ? 'text-green-500'
          : 'text-yellow-500'} font-ponzi-number font-bold text-lg"
    >
      {paybackTimeString}
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
      <!-- Land Purchase Cost -->
      {#if currentBuyPrice && landToken}
        <div
          class="flex justify-between select-text leading-none items-end pt-1"
        >
          <div class="flex items-center gap-1">
            <span class="opacity-75">Land cost:</span>
            <InfoTooltip
              text="The price you paid (or will pay) to buy this land"
            />
          </div>
          <div class="flex items-center gap-1 text-orange-400">
            <span>{currentBuyPrice.toString()} {landToken.symbol}</span>
            <TokenAvatar
              token={landToken}
              class="border border-white w-3 h-3"
            />
          </div>
        </div>

        {#if currentBuyPriceInBaseToken && baseToken}
          <div
            class="flex justify-between select-text leading-none items-end text-orange-400 opacity-75"
          >
            <span class="opacity-75">≈ Land cost:</span>
            <div class="flex items-center gap-1">
              <span
                >{currentBuyPriceInBaseToken.toString()}
                {baseToken.symbol}</span
              >
              <TokenAvatar
                token={baseToken}
                class="border border-white w-2 h-2"
              />
            </div>
          </div>
        {/if}
      {/if}

      {#if baseToken && nbNeighbors > 0}
        <!-- Detailed Yield Breakdown -->
        <div class="space-y-1">
          {#if grossYieldPerHour}
            <!-- Gross Yield Earnings -->
            <div
              class="flex justify-between select-text leading-none items-end"
            >
              <div class="flex items-center gap-1">
                <span class="opacity-75">+ Yield earnings:</span>
                <InfoTooltip
                  text="Total hourly income generated from neighboring lands based on selected neighbor count"
                />
              </div>
              <div class="flex items-center gap-1 text-green-400">
                <span>
                  +{grossYieldPerHour.toString()}
                  {baseToken.symbol}/h
                </span>
                <TokenAvatar
                  token={baseToken}
                  class="border border-white w-3 h-3"
                />
              </div>
            </div>
          {/if}

          {#if hourlyCostInBaseToken}
            <!-- Hourly Costs (Tax Payments) -->
            <div
              class="flex justify-between select-text leading-none items-end"
            >
              <div class="flex items-center gap-1">
                <span class="opacity-75">- Tax payments:</span>
                <InfoTooltip
                  text="Hourly taxes paid to neighboring land owners based on your sell price and neighbor count"
                />
              </div>
              <div class="flex items-center gap-1 text-red-400">
                <span>
                  -{hourlyCostInBaseToken.toString()}
                  {baseToken.symbol}/h
                </span>
                <TokenAvatar
                  token={baseToken}
                  class="border border-white w-3 h-3"
                />
              </div>
            </div>
          {/if}

          {#if netYieldPerHour}
            <!-- Net Result -->
            <div
              class="flex justify-between select-text leading-none items-end border-t border-slate-600/30 pt-1"
            >
              <div class="flex items-center gap-1">
                <span class="opacity-75 font-semibold">= Net yield:</span>
                <InfoTooltip
                  text="Net hourly profit/loss after subtracting tax payments from yield earnings"
                />
              </div>
              <div
                class="flex items-center gap-1 {netYieldPerHour
                  .rawValue()
                  .isNegative()
                  ? 'text-red-400'
                  : 'text-green-400'} font-semibold"
              >
                <span>
                  {netYieldPerHour.rawValue().isNegative() ? '' : '+'}
                  {netYieldPerHour.toString()}
                  {baseToken.symbol}/h
                </span>
                <TokenAvatar
                  token={baseToken}
                  class="border border-white w-3 h-3"
                />
              </div>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>
