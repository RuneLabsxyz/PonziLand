<script lang="ts">
  import type { HistoricalPosition } from '../historical-positions.service';
  import { calculatePositionMetrics } from '../position-pnl-calculator';
  import TokenFlowPopover from './token-flow-popover.svelte';

  interface Props {
    position: HistoricalPosition;
  }

  let { position }: Props = $props();

  // Calculate all position metrics once
  const metrics = $derived(calculatePositionMetrics(position));
  const netTokenFlow = $derived(metrics.netTokenFlow);
</script>

<div class="font-ponzi-number text-sm text-right tracking-widest">
  <TokenFlowPopover {position} {netTokenFlow} />
</div>
