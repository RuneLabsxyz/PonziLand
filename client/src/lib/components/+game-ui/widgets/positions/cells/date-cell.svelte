<script lang="ts">
  import { cn } from '$lib/utils';
  import { formatDateCompact, formatDuration } from '$lib/utils/date';
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

  let formatted = $derived(formatDateCompact(dateString));
  let isAuction = $derived(variant === 'buy' && buyTokenUsed === null);
  let typeClass = $derived(isAuction ? 'text-blue-400' : 'text-purple-400');
  let typeLabel = $derived(isAuction ? 'From Auction' : 'From Player');
  let icon = $derived(
    isAuction ? '/ui/icons/Icon_Auction.png' : '/ui/icons/Icon_MyLand2.png',
  );

  // Check if position is still open
  let isOpen = $derived(
    variant === 'close' &&
      (!position?.close_date || position.close_date === null),
  );

  // Calculate duration for close variant
  let duration = $derived.by(() => {
    if (variant === 'close' && position?.time_bought) {
      if (isOpen) {
        // For open positions, calculate duration from buy time to now
        return formatDuration(position.time_bought, new Date().toISOString());
      } else {
        // For closed positions, calculate duration from buy time to close date
        return formatDuration(position.time_bought, dateString);
      }
    }
    return null;
  });
</script>

{#if variant === 'buy'}
  <div class="flex gap-2 items-center whitespace-nowrap">
    <img src={icon} alt={typeLabel} class="inline h-6 w-6 mr-1" />
    <div
      class="flex text-gray-400 flex-col leading-none tracking-wider whitespace-nowrap"
    >
      <span class={cn(typeClass, 'tracking-wider')}>
        {typeLabel}
      </span>
      {formatted}
    </div>
  </div>
{:else}
  <div
    class="flex flex-col text-gray-400 tracking-wider leading-none whitespace-nowrap"
  >
    {#if isOpen}
      {#if duration}
        <span class="text-gray-500">({duration})</span>
      {/if}
      <span class="text-green-400">ongoing</span>
    {:else}
      {#if duration}
        <span class="text-gray-500">({duration})</span>
      {/if}
      <span>{formatted}</span>
    {/if}
  </div>
{/if}
