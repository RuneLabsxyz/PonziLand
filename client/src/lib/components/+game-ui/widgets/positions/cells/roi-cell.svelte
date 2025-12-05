<script lang="ts">
  import type { HistoricalPosition } from '../historical-positions.service';
  import InfoTooltip from '$lib/components/ui/info-tooltip.svelte';

  interface Props {
    position: HistoricalPosition;
  }

  let { position }: Props = $props();

  // Use pre-calculated metrics
  const roi = $derived(position.metrics?.roi ?? null);

  // Generate detailed calculation tooltip text
  const calculationDetails = $derived.by(() => {
    const metrics = position.metrics;
    if (!metrics) return '';
    
    const isOpen = metrics.isOpen;
    const statusText = isOpen ? '(ongoing)' : '(closed)';

    let details = `ROI Calculation Details ${statusText}\n\n`;

    // Investment breakdown
    details += `💰 Investment:\n`;
    const buyCost = metrics.buyCostBaseEquivalent?.rawValue().toNumber() || 0;
    const outflows =
      metrics.totalOutflowBaseEquivalent?.rawValue().toNumber() || 0;
    const totalInvestment = buyCost + outflows;
    details += `• Buy Cost: $${buyCost.toFixed(2)}\n`;
    details += `• Fees/Taxes: $${outflows.toFixed(2)}\n`;
    details += `• Total Investment: $${totalInvestment.toFixed(2)}\n\n`;

    // Revenue breakdown
    details += `📈 Revenue:\n`;
    const saleRevenue =
      metrics.saleRevenueBaseEquivalent?.rawValue().toNumber() || 0;
    const inflows =
      metrics.totalInflowBaseEquivalent?.rawValue().toNumber() || 0;
    const totalRevenue = saleRevenue + inflows;
    details += `• Sale Revenue: $${saleRevenue.toFixed(2)} ${isOpen ? '(pending)' : ''}\n`;
    details += `• Token Yields: $${inflows.toFixed(2)}\n`;
    details += `• Total Revenue: $${totalRevenue.toFixed(2)}\n\n`;

    // P&L calculation
    const pnl = totalRevenue - totalInvestment;
    details += `📊 Result:\n`;
    details += `• Profit/Loss: $${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}\n`;

    if (roi !== null) {
      details += `• ROI: ${roi >= 0 ? '+' : ''}${formatPercentage(roi)}%\n\n`;

      // Special cases
      if (totalInvestment === 0) {
        details += `⚡ Free Position: No investment cost\n`;
      } else if (Math.abs(totalInvestment) < 0.01) {
        details += `⚡ Minimal Cost: Very low investment\n`;
      }

      details += `\n🧮 Formula:\n`;
      details += `ROI = (Total Revenue - Total Investment) ÷ Total Investment × 100`;
    } else {
      details += `• ROI: Unable to calculate\n\n`;
      details += `❌ Missing data for calculation`;
    }

    return details;
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

    <!-- Info Tooltip with detailed breakdown -->
    <div class="mt-0.5">
      <InfoTooltip text={calculationDetails} />
    </div>
  </div>
</div>
