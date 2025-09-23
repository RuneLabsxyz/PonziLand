<script lang="ts">
  import TokenAvatar from '$lib/components/ui/token-avatar/token-avatar.svelte';
  import type { Token } from '$lib/interfaces';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { ChevronDown } from 'lucide-svelte';

  let {
    sellAmountVal,
    selectedToken,
    baseToken,
    landToken,
    sellerFeeAmount,
    netSellerProceeds,
    originalCost,
    originalCostInBaseToken,
    actualSellBenefit,
  }: {
    sellAmountVal: string;
    selectedToken: Token;
    baseToken: Token;
    landToken?: Token;
    sellerFeeAmount?: CurrencyAmount;
    netSellerProceeds?: CurrencyAmount;
    originalCost?: CurrencyAmount;
    originalCostInBaseToken?: CurrencyAmount;
    actualSellBenefit?: CurrencyAmount;
  } = $props();

  let isExpanded = $state(false);

  function toggleExpanded() {
    isExpanded = !isExpanded;
  }
</script>

{#if actualSellBenefit}
  <div class="bg-slate-800/30 border border-slate-600/30 rounded text-xs">
    <!-- Collapsed Header - Always Visible -->
    <button
      onclick={toggleExpanded}
      class="w-full flex justify-between items-center p-2 hover:bg-slate-700/20 transition-colors"
    >
      <div class="flex items-center gap-2">
        <span class="font-semibold text-yellow-400">Sale Profit:</span>
        <div
          class="{actualSellBenefit.rawValue().isNegative()
            ? 'text-red-500'
            : 'text-green-500'} flex items-center gap-1 font-semibold"
        >
          <span>
            {actualSellBenefit.rawValue().isNegative() ? '' : '+'}
            {actualSellBenefit.toString()} {baseToken.symbol}
          </span>
          <TokenAvatar
            token={baseToken}
            class="border border-white w-3 h-3"
          />
        </div>
      </div>
      
      <div class="transition-transform duration-200" class:rotate-180={isExpanded}>
        <ChevronDown size={16} class="text-slate-400" />
      </div>
    </button>

    <!-- Expanded Details -->
    {#if isExpanded}
      <div class="px-2 pb-2 space-y-1 border-t border-slate-600/30">
        <!-- Sell Price -->
        <div class="flex justify-between select-text leading-none items-end pt-1">
          <span class="opacity-75">Sell price:</span>
          <div class="flex items-center gap-1">
            <span>{CurrencyAmount.fromScaled(sellAmountVal, selectedToken).toString()} {selectedToken.symbol}</span>
            <TokenAvatar token={selectedToken} class="border border-white w-3 h-3" />
          </div>
        </div>

        {#if sellerFeeAmount}
          <!-- Seller Fee -->
          <div class="flex justify-between select-text leading-none items-end text-red-400">
            <span class="opacity-75">- Seller fee (5%):</span>
            <div class="flex items-center gap-1">
              <span>-{sellerFeeAmount.toString()} {selectedToken.symbol}</span>
              <TokenAvatar token={selectedToken} class="border border-white w-3 h-3" />
            </div>
          </div>
        {/if}

        {#if netSellerProceeds}
          <!-- Net Proceeds -->
          <div class="flex justify-between select-text leading-none items-end border-t border-slate-600/30 pt-1">
            <span class="opacity-75">= Net proceeds:</span>
            <div class="flex items-center gap-1 text-blue-400">
              <span>{netSellerProceeds.toString()} {selectedToken.symbol}</span>
              <TokenAvatar token={selectedToken} class="border border-white w-3 h-3" />
            </div>
          </div>

          {#if originalCost && landToken}
            <!-- Original Cost -->
            <div class="flex justify-between select-text leading-none items-end text-orange-400">
              <span class="opacity-75">- Original cost:</span>
              <div class="flex items-center gap-1">
                <span>-{originalCost.toString()} {landToken.symbol}</span>
                <TokenAvatar token={landToken} class="border border-white w-3 h-3" />
              </div>
            </div>
          {/if}
        {/if}

        <!-- Final Profit (repeated for clarity in expanded view) -->
        <div class="flex justify-between select-text leading-none items-end border-t border-slate-600/30 pt-1">
          <span class="font-semibold">= Actual profit:</span>
          <div
            class="{actualSellBenefit.rawValue().isNegative()
              ? 'text-red-500'
              : 'text-green-500'} flex items-center gap-1 font-semibold"
          >
            <span>
              {actualSellBenefit.rawValue().isNegative() ? '' : '+'}
              {actualSellBenefit.toString()} {baseToken.symbol}
            </span>
            <TokenAvatar
              token={baseToken}
              class="border border-white w-3 h-3"
            />
          </div>
        </div>
      </div>
    {/if}
  </div>
{/if}