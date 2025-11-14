<script lang="ts">
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { getTokenInfo } from '$lib/utils';
  import {
    walletStore,
    getBaseToken,
    originalBaseToken,
  } from '$lib/stores/wallet.svelte';
  import type { HistoricalPosition } from '../historical-positions.service';

  interface Props {
    position: HistoricalPosition;
  }

  let { position }: Props = $props();

  function isPositionOpen(position: HistoricalPosition): boolean {
    return !position.close_date || position.close_date === null;
  }

  // Match position-entry pattern for token selection
  let buyToken = $derived.by(() => {
    if (position.buy_token_used) {
      return getTokenInfo(position.buy_token_used);
    } else {
      return originalBaseToken;
    }
  });

  let saleToken = $derived.by(() => {
    if (position.sale_token_used) {
      return getTokenInfo(position.sale_token_used);
    } else {
      return originalBaseToken;
    }
  });

  let buyAmount = $derived(
    CurrencyAmount.fromUnscaled(position.buy_cost_token, buyToken),
  );

  let sellAmount = $derived(
    CurrencyAmount.fromUnscaled(position.sale_revenue_token || '0', saleToken),
  );

  // Calculate buy cost in base token equivalent
  let buyCostBaseEquivalent = $derived.by(() => {
    if (!buyToken || !buyAmount) return null;
    const baseToken = getBaseToken();
    return walletStore.convertTokenAmount(buyAmount, buyToken, baseToken);
  });

  // Calculate sale revenue in base token equivalent
  let saleRevenueBaseEquivalent = $derived.by(() => {
    if (!saleToken || !sellAmount || isPositionOpen(position)) return null;
    const baseToken = getBaseToken();
    return walletStore.convertTokenAmount(sellAmount, saleToken, baseToken);
  });

  // Calculate net sale profit (sale revenue - buy cost) in base token equivalent
  let netSaleProfit = $derived.by(() => {
    if (
      !buyCostBaseEquivalent ||
      !saleRevenueBaseEquivalent ||
      isPositionOpen(position)
    )
      return null;
    const baseToken = getBaseToken();
    const netValue = saleRevenueBaseEquivalent
      .rawValue()
      .minus(buyCostBaseEquivalent.rawValue());
    return CurrencyAmount.fromRaw(netValue, baseToken);
  });
</script>

<div class="text-right">
  {#if netSaleProfit && !isPositionOpen(position)}
    <span
      class={netSaleProfit.rawValue().isPositive()
        ? 'text-green-400'
        : 'text-red-400'}
    >
      {netSaleProfit.rawValue().isPositive() ? '+' : ''}{netSaleProfit
        .rawValue()
        .toNumber()
        .toFixed(2)} $
    </span>
  {:else}
    <span class="text-gray-500">{isPositionOpen(position) ? 'TBD' : '-'}</span>
  {/if}
</div>
