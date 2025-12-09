<script lang="ts">
  import type { HistoricalPosition } from '../historical-positions.service';
  import TokenFlowPopover from './token-flow-popover.svelte';

  interface Props {
    position: HistoricalPosition;
  }

  let { position }: Props = $props();

  // Use pre-calculated metrics
  const netTokenFlow = $derived(position.metrics?.netTokenFlow ?? null);
</script>

<div
  class="font-ponzi-number text-sm text-right tracking-widest whitespace-nowrap"
>
  <TokenFlowPopover {position} {netTokenFlow} />
</div>
