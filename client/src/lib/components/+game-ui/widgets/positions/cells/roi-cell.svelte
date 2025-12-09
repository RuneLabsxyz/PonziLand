<script lang="ts">
  import type { HistoricalPosition } from '../historical-positions.service';
  import { formatPercentage } from '$lib/utils/format';

  interface Props {
    position: HistoricalPosition;
  }

  let { position }: Props = $props();

  // Use pre-calculated metrics
  const roi = $derived(position.metrics?.roi ?? null);
</script>

<div class="text-right whitespace-nowrap">
  <div class="flex items-center justify-end gap-1">
    <!-- ROI Display -->
    {#if roi !== null}
      <div
        class={`font-ponzi-number text-sm tracking-widest ${roi > 0 ? 'text-green-400' : 'text-red-400'}`}
      >
        {formatPercentage(roi)}
      </div>
    {:else}
      <div class="font-ponzi-number text-sm tracking-widest text-gray-500">
        -
      </div>
    {/if}
  </div>
</div>
