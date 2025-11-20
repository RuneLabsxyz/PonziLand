<script lang="ts">
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { getTokenInfo } from '$lib/utils';
  import {
    walletStore,
    getBaseToken,
    originalBaseToken,
  } from '$lib/stores/wallet.svelte';
  import type { HistoricalPosition } from '../historical-positions.service';
  import InfoTooltip from '$lib/components/ui/info-tooltip.svelte';

  interface Props {
    position: HistoricalPosition;
  }

  let { position }: Props = $props();

  function calculateDurationHours(
    startDate: string,
    endDate: string | null,
  ): number {
    try {
      const start = new Date(startDate);
      const end = endDate ? new Date(endDate) : new Date();
      const diffMs = end.getTime() - start.getTime();
      return Math.max(diffMs / (1000 * 60 * 60), 0.01); // Minimum 0.01 hours to avoid division by zero
    } catch {
      return 0.01;
    }
  }

  const durationHours = $derived(
    calculateDurationHours(position.time_bought, position.close_date),
  );

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

  // Calculate buy cost in base token equivalent (initial investment)
  let buyCostBaseEquivalent = $derived.by(() => {
    if (!buyToken || !buyAmount) return null;
    const baseToken = getBaseToken();
    return walletStore.convertTokenAmount(buyAmount, buyToken, baseToken);
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

  // Calculate net token flow (land yield) per hour
  const tokenFlowYieldPerHour = $derived.by(() => {
    if (
      !totalInflowBaseEquivalent ||
      !totalOutflowBaseEquivalent ||
      durationHours <= 0
    )
      return null;

    const baseToken = getBaseToken();
    const netTokenFlow = totalInflowBaseEquivalent
      .rawValue()
      .minus(totalOutflowBaseEquivalent.rawValue());

    const netTokenFlowAmount = CurrencyAmount.fromRaw(netTokenFlow, baseToken);
    const hourlyYield = netTokenFlowAmount.rawValue().dividedBy(durationHours);

    return CurrencyAmount.fromRaw(hourlyYield, baseToken);
  });

  // Calculate ROI per hour based on initial investment
  const investmentROIPerHour = $derived.by(() => {
    if (
      !buyCostBaseEquivalent ||
      !tokenFlowYieldPerHour ||
      buyCostBaseEquivalent.rawValue().isZero()
    ) {
      return null;
    }

    // ROI per hour as percentage = (hourly yield / initial investment) * 100
    const roiPerHour = tokenFlowYieldPerHour
      .rawValue()
      .dividedBy(buyCostBaseEquivalent.rawValue())
      .multipliedBy(100);

    return roiPerHour.toNumber();
  });

  // Calculate APY (Annual Percentage Yield)
  const apy = $derived.by(() => {
    if (investmentROIPerHour === null) return null;

    // Convert hourly ROI to APY using compound interest formula
    // APY = (1 + hourly_rate)^(hours_per_year) - 1
    const hourlyRate = investmentROIPerHour / 100; // Convert percentage to decimal
    const hoursPerYear = 365.25 * 24; // 8766 hours per year

    if (hourlyRate <= -1) {
      // If losing more than 100% per hour, cap the negative APY
      return -100;
    }

    const apyValue = Math.pow(1 + hourlyRate, hoursPerYear) - 1;
    return apyValue * 100; // Convert back to percentage
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

  // Format APY with appropriate precision and handling for extreme values
  function formatAPY(value: number): string {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    } else if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    } else if (Math.abs(value) >= 10) {
      return value.toFixed(0);
    } else {
      return value.toFixed(1);
    }
  }

  // Generate detailed calculation tooltip text
  const calculationDetails = $derived.by(() => {
    const baseToken = getBaseToken();
    const isOpen = !position.close_date || position.close_date === null;
    const statusText = isOpen ? '(ongoing)' : '(closed)';

    let details = `ROI Calculation Details ${statusText}\n\n`;

    // Duration
    const durationDays = (durationHours / 24).toFixed(2);
    details += `Duration: ${durationHours.toFixed(2)} hours (${durationDays} days)\n\n`;

    // Initial Investment
    const buyAmountValue = buyAmount?.rawValue().toNumber() || 0;
    const buyCostValue = buyCostBaseEquivalent?.rawValue().toNumber() || 0;
    details += `Initial Investment:\n`;
    details += `• ${buyAmountValue.toFixed(4)} ${buyToken?.symbol || 'tokens'}\n`;
    details += `• ≈ $${buyCostValue.toFixed(2)} (base equivalent)\n\n`;

    // Token Flows
    const inflowValue = totalInflowBaseEquivalent?.rawValue().toNumber() || 0;
    const outflowValue = totalOutflowBaseEquivalent?.rawValue().toNumber() || 0;
    const netFlowValue = inflowValue - outflowValue;

    details += `Token Flows (base equivalent):\n`;
    details += `• Inflows: +$${inflowValue.toFixed(4)}\n`;
    details += `• Outflows: -$${outflowValue.toFixed(4)}\n`;
    details += `• Net Flow: $${netFlowValue >= 0 ? '+' : ''}${netFlowValue.toFixed(4)}\n\n`;

    // Hourly Calculations
    const hourlyYieldValue = tokenFlowYieldPerHour?.rawValue().toNumber() || 0;
    details += `Hourly Metrics:\n`;
    details += `• Yield: $${hourlyYieldValue >= 0 ? '+' : ''}${hourlyYieldValue.toFixed(4)}/hour\n`;

    if (investmentROIPerHour !== null) {
      details += `• ROI: ${investmentROIPerHour >= 0 ? '+' : ''}${investmentROIPerHour.toFixed(4)}%/hour\n`;
    }

    if (apy !== null) {
      details += `• APY: ${apy >= 0 ? '+' : ''}${formatAPY(apy)}% (compound)\n`;
    }

    details += `\nFormulas:\n`;
    details += `• Hourly Yield = Net Flow ÷ Duration Hours\n`;
    details += `• ROI/h = (Hourly Yield ÷ Initial Investment) × 100\n`;
    details += `• APY = (1 + ROI/h/100)^(365.25×24) - 1`;

    return details;
  });
</script>

<div class="text-right">
  <div class="flex items-start justify-end gap-1">
    <div class="flex flex-col items-end">
      <!-- Token Flow Yield per Hour -->
      {#if tokenFlowYieldPerHour}
        <div
          class={tokenFlowYieldPerHour.rawValue().isPositive()
            ? 'text-green-400'
            : 'text-red-400'}
        >
          {tokenFlowYieldPerHour.rawValue().isPositive()
            ? '+'
            : ''}{tokenFlowYieldPerHour.rawValue().toNumber().toFixed(3)}$/h
        </div>
      {:else}
        <div class="text-gray-500">-</div>
      {/if}

      <!-- ROI per Hour -->
      {#if investmentROIPerHour !== null}
        <div
          class={`text-xs ${investmentROIPerHour > 0 ? 'text-green-300' : 'text-red-300'}`}
        >
          {investmentROIPerHour > 0 ? '+' : ''}{formatPercentage(
            investmentROIPerHour,
          )}%/h
        </div>
      {:else}
        <div class="text-xs text-gray-500">-</div>
      {/if}

      <!-- APY -->
      {#if apy !== null}
        <div class={`text-xs ${apy > 0 ? 'text-green-200' : 'text-red-200'}`}>
          {apy > 0 ? '+' : ''}{formatAPY(apy)}% APY
        </div>
      {:else}
        <div class="text-xs text-gray-500">-</div>
      {/if}
    </div>

    <!-- Info Tooltip -->
    <div class="mt-0.5">
      <InfoTooltip text={calculationDetails} />
    </div>
  </div>
</div>
