<script lang="ts">
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { getTokenInfo } from '$lib/utils';
  import {
    walletStore,
    getBaseToken,
    originalBaseToken,
  } from '$lib/stores/wallet.svelte';
  import TokenAvatar from '$lib/components/ui/token-avatar/token-avatar.svelte';
  import type { HistoricalPosition } from '../historical-positions.service';

  interface Props {
    position: HistoricalPosition;
  }

  let { position }: Props = $props();

  // Get the largest outflow token and amount for display
  const displayData = $derived.by(() => {
    if (
      !position.token_outflows ||
      Object.keys(position.token_outflows).length === 0
    ) {
      return null;
    }

    const baseToken = getBaseToken();
    let largestOutflow = null;
    let largestValue = 0;

    // Find the outflow with the largest base token equivalent value
    for (const [tokenAddress, amount] of Object.entries(
      position.token_outflows,
    )) {
      const tokenInfo = getTokenInfo(tokenAddress);
      if (tokenInfo) {
        const outflowAmount = CurrencyAmount.fromUnscaled(amount, tokenInfo);
        const baseEquivalent = walletStore.convertTokenAmount(
          outflowAmount,
          tokenInfo,
          baseToken,
        );

        if (baseEquivalent) {
          const value = baseEquivalent.rawValue().toNumber();
          if (value > largestValue) {
            largestValue = value;
            largestOutflow = {
              amount: outflowAmount,
              token: tokenInfo,
              baseEquivalent,
            };
          }
        }
      }
    }

    return largestOutflow;
  });

  // Calculate total outflow for comparison
  const totalOutflowBaseEquivalent = $derived.by(() => {
    const baseToken = getBaseToken();
    let total = CurrencyAmount.fromScaled(0, baseToken);

    for (const [tokenAddress, amount] of Object.entries(
      position.token_outflows,
    )) {
      const tokenInfo = getTokenInfo(tokenAddress);
      if (tokenInfo) {
        const outflowAmount = CurrencyAmount.fromUnscaled(amount, tokenInfo);
        const convertedAmount = walletStore.convertTokenAmount(
          outflowAmount,
          tokenInfo,
          baseToken,
        );
        if (convertedAmount) {
          total = total.add(convertedAmount);
        }
      }
    }

    return total.isZero() ? null : total;
  });
</script>

{#if displayData}
  <div class="flex flex-col items-end leading-none tracking-wider whitespace-nowrap">
    {#if totalOutflowBaseEquivalent && !totalOutflowBaseEquivalent.isZero()}
      <div
        class="flex gap-1 tracking-widest font-ponzi-number text-xs items-center"
      >
        <span class="flex opacity-80 text-red-400">
          <span>-$</span>
          {totalOutflowBaseEquivalent.rawValue().toNumber().toFixed(2)}
        </span>
        <span><TokenAvatar token={displayData.token} /></span>
      </div>
    {/if}
    <div class="flex items-center gap-1 leading-none">
      <span class="text-gray-400">-{displayData.amount.toString()}</span>
      <span class="text-gray-500">{displayData.token.symbol}</span>
    </div>
  </div>
{:else}
  <span class="text-gray-500">-</span>
{/if}
