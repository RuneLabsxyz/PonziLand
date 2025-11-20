<script lang="ts">
  import { cn } from '$lib/utils';

  interface Props {
    dateString: string;
    buyTokenUsed?: string | null;
    variant?: 'buy' | 'close';
  }

  let { dateString, buyTokenUsed = null, variant = 'close' }: Props = $props();

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
  <span class="text-gray-400">{formatted}</span>
{/if}
