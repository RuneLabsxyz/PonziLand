<script lang="ts">
  import { cn } from '$lib/utils';
  import type { HistoricalPosition } from '../historical-positions.service';

  interface Props {
    dateString: string;
    buyTokenUsed?: string | null;
    variant?: 'buy' | 'close';
    position?: HistoricalPosition;
  }

  let {
    dateString,
    buyTokenUsed = null,
    variant = 'close',
    position,
  }: Props = $props();

  function formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  }

  function formatDuration(startDate: string, endDate: string): string {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

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

  let formatted = $derived(formatDate(dateString));
  let isAuction = $derived(variant === 'buy' && buyTokenUsed === null);
  let typeClass = $derived(isAuction ? 'text-blue-400' : 'text-purple-400');
  let typeLabel = $derived(isAuction ? 'From Auction' : 'From Player');
  let icon = $derived(
    isAuction ? '/ui/icons/Icon_Auction.png' : '/ui/icons/Icon_MyLand2.png',
  );

  let duration = $derived(
    variant === 'close' && position
      ? formatDuration(position.time_bought, dateString)
      : null,
  );
</script>

{#if variant === 'buy'}
  <div class="flex gap-2 items-center">
    <img src={icon} alt={typeLabel} class="inline h-6 w-6 mr-1" />
    <div class="flex text-gray-400 flex-col leading-none tracking-wider">
      <span class={cn(typeClass, 'tracking-wider')}>
        {typeLabel}
      </span>
      {formatted}
    </div>
  </div>
{:else}
  <div class="flex flex-col text-gray-400 tracking-wider leading-none">
    <span>{formatted}</span>
  </div>
{/if}
