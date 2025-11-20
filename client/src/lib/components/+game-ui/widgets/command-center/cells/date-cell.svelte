<script lang="ts">
  interface Props {
    dateString: string;
    buyTokenUsed?: string | null;
    variant?: 'buy' | 'close';
  }

  let { dateString, buyTokenUsed = null, variant = 'close' }: Props = $props();

  function formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  }

  const formatted = formatDate(dateString);
  const isAuction = variant === 'buy' && buyTokenUsed === null;
  const typeClass = isAuction ? 'text-blue-400' : 'text-purple-400';
  const typeLabel = isAuction ? 'from auction' : 'from player';
</script>

{#if variant === 'buy'}
  <div class="flex text-gray-400 flex-col">
    {formatted}
    <span class={typeClass}>{typeLabel}</span>
  </div>
{:else}
  <span class="text-gray-400">{formatted}</span>
{/if}
