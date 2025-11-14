<script lang="ts">
  interface Props {
    cost: string | null;
    tokenSymbol?: string;
    variant?: 'buy' | 'sale';
  }

  let { cost, tokenSymbol = 'ETH', variant = 'buy' }: Props = $props();
</script>

<div class="text-right">
  {#if cost}
    <span class="text-white">{cost}</span>
    <span class="text-gray-500 ml-1">{tokenSymbol}</span>
  {:else}
    <span class="text-gray-500">-</span>
  {/if}
</div>
