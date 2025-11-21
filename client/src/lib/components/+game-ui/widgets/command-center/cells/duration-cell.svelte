<script lang="ts">
  import type { HistoricalPosition } from '../historical-positions.service';

  interface Props {
    position: HistoricalPosition;
  }

  let { position }: Props = $props();

  function formatDuration(startDate: string, endDate: string | null): string {
    try {
      const start = new Date(startDate);
      const end = endDate ? new Date(endDate) : new Date();

      const diffMs = end.getTime() - start.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays > 0) {
        return `${diffDays}d`;
      } else if (diffHours > 0) {
        return `${diffHours}h`;
      } else if (diffMinutes > 0) {
        return `${diffMinutes}m`;
      } else {
        return '<1m';
      }
    } catch {
      return '-';
    }
  }

  function isPositionOpen(position: HistoricalPosition): boolean {
    return !position.close_date || position.close_date === null;
  }

  const isOpen = $derived(isPositionOpen(position));
  const duration = $derived(
    formatDuration(position.time_bought, position.close_date),
  );
  const textColor = $derived(isOpen ? 'text-green-400' : 'text-gray-400');
</script>

<div class="text-right tracking-wider {textColor}">
  {duration}
  {#if isOpen}
    <span class="text-xs text-green-300 ml-1">ongoing</span>
  {/if}
</div>
