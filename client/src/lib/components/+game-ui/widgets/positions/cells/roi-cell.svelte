<script lang="ts">
  import type { HistoricalPosition } from '../historical-positions.service';

  interface Props {
    position: HistoricalPosition;
  }

  let { position }: Props = $props();

  // Use pre-calculated metrics
  const roi = $derived(position.metrics?.roi ?? null);

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

<div class="text-right whitespace-nowrap">
  <div class="flex items-center justify-end gap-1">
    <!-- ROI Display -->
    {#if roi !== null}
      <div
        class={`font-ponzi-number text-sm tracking-widest ${roi > 0 ? 'text-green-400' : 'text-red-400'}`}
      >
        {roi > 0 ? '+' : ''}{formatPercentage(roi)}%
      </div>
    {:else}
      <div class="font-ponzi-number text-sm tracking-widest text-gray-500">
        -
      </div>
    {/if}
  </div>
</div>
