<script lang="ts">
  import type { HistoricalPosition } from '../historical-positions.service';
  import { calculatePositionMetrics } from '../position-pnl-calculator';

  interface Props {
    position: HistoricalPosition;
  }

  let { position }: Props = $props();

  // Calculate all position metrics once
  const metrics = $derived(calculatePositionMetrics(position));
  const netSaleProfit = $derived(metrics.netSaleProfit);
  const isOpen = $derived(metrics.isOpen);
</script>

<div
  class="text-right font-ponzi-number text-sm tracking-widest whitespace-nowrap"
>
  {#if netSaleProfit}
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
    <span class="text-gray-500">-</span>
  {/if}
</div>
