<script lang="ts">
  import {
    getBaseToken,
    originalBaseToken,
    walletStore,
  } from '$lib/stores/wallet.svelte';
  import { getTokenInfo } from '$lib/utils';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import type { HistoricalPosition } from '../historical-positions.service';

  interface Props {
    position: HistoricalPosition;
  }

  let { position }: Props = $props();

  // Get buy token and amount
  let buyToken = $derived.by(() => {
    if (position.buy_token_used) {
      return getTokenInfo(position.buy_token_used);
    } else {
      return originalBaseToken;
    }
  });

  let buyAmount = $derived(
    CurrencyAmount.fromUnscaled(position.buy_cost_token, buyToken),
  );

  let sellToken = $derived.by(() => {
    if (position.sale_token_used) {
      return getTokenInfo(position.sale_token_used);
    } else {
      return originalBaseToken;
    }
  });

  let sellAmount = $derived.by(() => {
    if (position.sale_revenue_token) {
      return CurrencyAmount.fromUnscaled(
        position.sale_revenue_token,
        sellToken,
      );
    } else {
      return null;
    }
  });

  // Calculate buy cost in base token equivalent (initial investment)
  let buyCostBaseEquivalent = $derived.by(() => {
    if (!buyToken || !buyAmount) return null;
    const baseToken = getBaseToken();
    return walletStore.convertTokenAmount(buyAmount, buyToken, baseToken);
  });

  let sellRevenueBaseEquivalent = $derived.by(() => {
    if (!sellToken || !sellAmount) return null;
    const baseToken = getBaseToken();
    return walletStore.convertTokenAmount(sellAmount, sellToken, baseToken);
  });

  // Calculate total token inflow in base token equivalent
  const totalInflowBaseEquivalent = $derived.by(() => {
    const baseToken = getBaseToken();
    let total = CurrencyAmount.fromScaled(0, baseToken);

    for (const [tokenAddress, amount] of Object.entries(
      position.token_inflows,
    )) {
      const tokenInfo = getTokenInfo(tokenAddress);
      if (tokenInfo) {
        const inflowAmount = CurrencyAmount.fromUnscaled(amount, tokenInfo);
        const convertedAmount = walletStore.convertTokenAmount(
          inflowAmount,
          tokenInfo,
          baseToken,
        );
        if (convertedAmount) {
          total = total.add(convertedAmount);
        }
      }
    }

    return total;
  });

  // Calculate total token outflow in base token equivalent
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

    return total;
  });

  let roi = $derived.by(() => {
    // The full investment is buyCost + paid taxes fees outflow
    // The revenue is inflow + sell revenue
    // ROI is percentage of pnl over the full investment can be positive or neg
    if (
      !buyCostBaseEquivalent ||
      !totalInflowBaseEquivalent ||
      !totalOutflowBaseEquivalent
    ) {
      return null;
    }

    // Handle case where position is still open (no sell revenue yet)
    const sellRevenue =
      sellRevenueBaseEquivalent || CurrencyAmount.fromScaled(0, getBaseToken());

    // Calculate total investment = initial buy cost + outflows (taxes, fees)
    const totalInvestment = buyCostBaseEquivalent.add(
      totalOutflowBaseEquivalent,
    );

    // Calculate total revenue = sell revenue + inflows
    const totalRevenue = sellRevenue.add(totalInflowBaseEquivalent);

    // Calculate profit/loss = revenue - investment
    const pnl = totalRevenue.rawValue().minus(totalInvestment.rawValue());

    // Handle zero total investment (free land with no fees/taxes)
    const investmentValue = totalInvestment.rawValue();
    if (investmentValue.isZero()) {
      // If we have profit on zero total investment, show very high return
      if (pnl.isPositive()) {
        return 9999; // Cap at 9999% for display (represents infinity)
      } else if (pnl.isZero()) {
        return 0; // No change on no investment
      } else {
        return -100; // Complete loss
      }
    }

    // Calculate ROI percentage = (pnl / total investment) * 100
    const roiPercent = pnl.dividedBy(investmentValue).multipliedBy(100);

    return roiPercent.toNumber();
  });

  // Format percentage with appropriate precision
  function formatPercentage(value: number): string {
    const abs = Math.abs(value);
    if (abs >= 10) {
      return value.toFixed(1);
    } else if (abs >= 1) {
      return value.toFixed(2);
    } else if (abs >= 0.01) {
      return value.toFixed(3);
    } else {
      return value.toFixed(4);
    }
  }
</script>

<div class="text-right">
  <div class="flex items-start justify-end gap-1">
    <div class="flex flex-col items-end">
      <!-- ROI Display -->
      {#if roi !== null}
        <div class={`text-sm ${roi > 0 ? 'text-green-400' : 'text-red-400'}`}>
          {roi > 0 ? '+' : ''}{formatPercentage(roi)}%
        </div>
      {:else}
        <div class="text-sm text-gray-500">-</div>
      {/if}
    </div>
  </div>
</div>
