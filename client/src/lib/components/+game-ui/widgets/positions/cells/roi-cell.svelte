<script lang="ts">
  import type { HistoricalPosition } from '../historical-positions.service';
  import * as Tooltip from '$lib/components/ui/tooltip';

  interface Props {
    position: HistoricalPosition;
  }

  let { position }: Props = $props();

  // Use pre-calculated metrics
  const roi = $derived(position.metrics?.roi ?? null);

  // Generate detailed calculation breakdown data
  const calculationBreakdown = $derived.by(() => {
    const metrics = position.metrics;
    if (!metrics) return null;

    const isOpen = metrics.isOpen;
    const buyCost = metrics.buyCostBaseEquivalent?.rawValue().toNumber() || 0;
    const outflows =
      metrics.totalOutflowBaseEquivalent?.rawValue().toNumber() || 0;
    const totalInvestment = buyCost + outflows;
    const saleRevenue =
      metrics.saleRevenueBaseEquivalent?.rawValue().toNumber() || 0;
    const inflows =
      metrics.totalInflowBaseEquivalent?.rawValue().toNumber() || 0;
    const totalRevenue = saleRevenue + inflows;
    const pnl = totalRevenue - totalInvestment;

    return {
      isOpen,
      investment: { buyCost, outflows, total: totalInvestment },
      revenue: { saleRevenue, inflows, total: totalRevenue },
      pnl,
    };
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
    {#if calculationBreakdown}
      <div class="mt-0.5">
        <Tooltip.Root>
          <Tooltip.Trigger>
            <div
              class="w-3 h-3 rounded-full bg-gray-600 hover:bg-gray-500 flex items-center justify-center cursor-help"
            >
              <div class="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
            </div>
          </Tooltip.Trigger>
          <Tooltip.Content class="max-w-80 p-4 text-xs bg-ponzi text-white">
            <div class="font-semibold mb-3 text-white">
              ROI Calculation Details {calculationBreakdown.isOpen
                ? '(ongoing)'
                : '(closed)'}
            </div>

            <!-- Investment breakdown -->
            <div class="mb-3">
              <div class="text-yellow-400 font-medium mb-1">💰 Investment:</div>
              <div class="pl-2 space-y-1 text-gray-300">
                <div>
                  • Buy Cost: ${calculationBreakdown.investment.buyCost.toFixed(
                    2,
                  )}
                </div>
                <div>
                  • Fees/Taxes: ${calculationBreakdown.investment.outflows.toFixed(
                    2,
                  )}
                </div>
                <div class="text-white font-medium">
                  • Total Investment: ${calculationBreakdown.investment.total.toFixed(
                    2,
                  )}
                </div>
              </div>
            </div>

            <!-- Revenue breakdown -->
            <div class="mb-3">
              <div class="text-green-400 font-medium mb-1">📈 Revenue:</div>
              <div class="pl-2 space-y-1 text-gray-300">
                <div>
                  • Sale Revenue: ${calculationBreakdown.revenue.saleRevenue.toFixed(
                    2,
                  )}
                  {calculationBreakdown.isOpen ? '(pending)' : ''}
                </div>
                <div>
                  • Token Yields: ${calculationBreakdown.revenue.inflows.toFixed(
                    2,
                  )}
                </div>
                <div class="text-white font-medium">
                  • Total Revenue: ${calculationBreakdown.revenue.total.toFixed(
                    2,
                  )}
                </div>
              </div>
            </div>

            <!-- P&L calculation -->
            <div class="mb-3">
              <div class="text-blue-400 font-medium mb-1">📊 Result:</div>
              <div class="pl-2 space-y-1">
                <div class="text-white font-medium">
                  • Profit/Loss: {calculationBreakdown.pnl >= 0
                    ? '+'
                    : ''}${calculationBreakdown.pnl.toFixed(2)}
                </div>
                {#if roi !== null}
                  <div class="text-white font-medium">
                    • ROI: {roi >= 0 ? '+' : ''}{formatPercentage(roi)}%
                  </div>
                {:else}
                  <div class="text-red-400">• ROI: Unable to calculate</div>
                {/if}
              </div>
            </div>

            <!-- Special cases and formula -->
            {#if roi !== null}
              {#if calculationBreakdown.investment.total === 0}
                <div class="text-yellow-300 mb-2">
                  ⚡ Free Position: No investment cost
                </div>
              {:else if Math.abs(calculationBreakdown.investment.total) < 0.01}
                <div class="text-yellow-300 mb-2">
                  ⚡ Minimal Cost: Very low investment
                </div>
              {/if}

              <div class="text-gray-400 border-t border-gray-600 pt-2">
                <div class="font-medium mb-1">🧮 Formula:</div>
                <div class="text-xs">
                  ROI = (Total Revenue - Total Investment) ÷ Total Investment ×
                  100
                </div>
              </div>
            {:else}
              <div class="text-red-400">❌ Missing data for calculation</div>
            {/if}
          </Tooltip.Content>
        </Tooltip.Root>
      </div>
    {/if}
  </div>
</div>
