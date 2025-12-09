<script lang="ts">
  import type { HistoricalPosition } from '../historical-positions.service';

  interface Props {
    position: HistoricalPosition;
  }

  let { position }: Props = $props();

  // Use pre-calculated metrics
  const netSaleProfit = $derived(position.metrics?.netSaleProfit ?? null);
  const isOpen = $derived(position.metrics?.isOpen ?? false);
</script>

<div class="text-right font-ponzi-number text-sm tracking-widest">
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
