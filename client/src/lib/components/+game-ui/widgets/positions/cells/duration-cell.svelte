<script lang="ts">
  import { formatDuration } from '$lib/utils/date';
  import type { HistoricalPosition } from '../historical-positions.service';

  interface Props {
    position: HistoricalPosition;
  }

  let { position }: Props = $props();

  function isPositionOpen(position: HistoricalPosition): boolean {
    return !position.close_date || position.close_date === null;
  }

  const isOpen = $derived(isPositionOpen(position));
  const duration = $derived(
    formatDuration(
      position.time_bought,
      position.close_date || new Date().toISOString(),
    ),
  );
  const textColor = $derived(isOpen ? 'text-green-400' : 'text-gray-400');
</script>

<div class="text-right tracking-wider {textColor}">
  {duration}
  {#if isOpen}
    <span class="text-xs text-green-300 ml-1">ongoing</span>
  {/if}
</div>
