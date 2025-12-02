<script lang="ts">
  import { cn } from '$lib/utils';
  import { formatDate } from '$lib/utils/date';
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

  let formatted = $derived(formatDate(dateString));
  let isAuction = $derived(variant === 'buy' && buyTokenUsed === null);
  let typeClass = $derived(isAuction ? 'text-blue-400' : 'text-purple-400');
  let typeLabel = $derived(isAuction ? 'From Auction' : 'From Player');
  let icon = $derived(
    isAuction ? '/ui/icons/Icon_Auction.png' : '/ui/icons/Icon_MyLand2.png',
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
