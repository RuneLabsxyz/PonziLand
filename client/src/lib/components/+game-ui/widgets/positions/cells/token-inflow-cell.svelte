<script lang="ts">
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { getTokenInfo } from '$lib/utils';
  import { walletStore, getBaseToken } from '$lib/stores/wallet.svelte';
  import TokenAvatar from '$lib/components/ui/token-avatar/token-avatar.svelte';
  import { ChevronDown, ChevronUp } from 'lucide-svelte';
  import type { HistoricalPosition } from '../historical-positions.service';
  import { calculatePositionMetrics } from '../position-pnl-calculator';

  interface Props {
    position: HistoricalPosition;
  }

  let { position }: Props = $props();
  let isExpanded = $state(false);

  // Calculate all position metrics once
  const metrics = $derived(calculatePositionMetrics(position));
  const totalInflowBaseEquivalent = $derived(metrics.totalInflowBaseEquivalent);

  // Process all inflow tokens with their details
  const inflowTokens = $derived.by(() => {
    if (
      !position.token_inflows ||
      Object.keys(position.token_inflows).length === 0
    ) {
      return [];
    }

    const baseToken = getBaseToken();
    const tokens = [];

    for (const [tokenAddress, amount] of Object.entries(
      position.token_inflows,
    )) {
      const tokenInfo = getTokenInfo(tokenAddress);
      if (tokenInfo) {
        const inflowAmount = CurrencyAmount.fromUnscaled(amount, tokenInfo);
        const baseEquivalent = walletStore.convertTokenAmount(
          inflowAmount,
          tokenInfo,
          baseToken,
        );

        if (baseEquivalent && !baseEquivalent.isZero()) {
          tokens.push({
            token: tokenInfo,
            amount: inflowAmount,
            baseEquivalent,
          });
        }
      }
    }

    // Sort by base equivalent value (largest first)
    return tokens.sort(
      (a, b) =>
        b.baseEquivalent.rawValue().toNumber() -
        a.baseEquivalent.rawValue().toNumber(),
    );
  });

  const hasMultipleTokens = $derived(inflowTokens.length > 1);
</script>

{#if inflowTokens.length > 0}
  <div
    class="flex flex-col items-end leading-none tracking-wider whitespace-nowrap"
  >
    <!-- Summary Row -->
    <div class="flex items-center gap-1">
      {#if totalInflowBaseEquivalent && !totalInflowBaseEquivalent.isZero()}
        <div
          class="flex gap-1 tracking-widest font-ponzi-number text-xs items-center"
        >
          <span class="flex opacity-80 text-green-400">
            <span>+$</span>
            {totalInflowBaseEquivalent.rawValue().toNumber().toFixed(2)}
          </span>

          <!-- Token Avatars -->
          <div class="flex -space-x-1">
            {#each inflowTokens.slice(0, 3) as tokenData}
              <div class="w-4 h-4">
                <TokenAvatar token={tokenData.token} />
              </div>
            {/each}
            {#if inflowTokens.length > 3}
              <div
                class="w-4 h-4 bg-gray-700 rounded-full flex items-center justify-center text-[8px] text-gray-300"
              >
                +{inflowTokens.length - 3}
              </div>
            {/if}
          </div>
        </div>
      {/if}

      <!-- Expand/Collapse Button -->
      {#if hasMultipleTokens}
        <button
          onclick={() => (isExpanded = !isExpanded)}
          class="text-gray-400 hover:text-gray-200 transition-colors p-0.5"
          title={isExpanded ? 'Collapse details' : 'Expand details'}
        >
          {#if isExpanded}
            <ChevronUp size={12} />
          {:else}
            <ChevronDown size={12} />
          {/if}
        </button>
      {/if}
    </div>

    <!-- Expanded Details -->
    {#if isExpanded && hasMultipleTokens}
      <div class="mt-1 space-y-0.5 text-xs">
        {#each inflowTokens as tokenData}
          <div class="flex items-center gap-1 justify-end">
            <span class="text-gray-400">+{tokenData.amount.toString()}</span>
            <span class="text-gray-500">{tokenData.token.symbol}</span>
            <div class="w-3 h-3">
              <TokenAvatar token={tokenData.token} />
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
{:else}
  <span class="text-gray-500">-</span>
{/if}
