<script lang="ts">
  import TokenAvatar from '$lib/components/ui/token-avatar/token-avatar.svelte';
  import type { HistoricalPosition } from '../historical-positions.service';

  interface Props {
    position: HistoricalPosition;
  }

  let { position }: Props = $props();

  // Use pre-calculated metrics - since outflow is always one token, just get the first one
  const totalOutflowBaseEquivalent = $derived(
    position.metrics?.totalOutflowBaseEquivalent ?? null,
  );
  const outflowTokens = $derived(position.metrics?.outflowTokens ?? []);
  const displayData = $derived(outflowTokens[0] ?? null);
</script>

{#if displayData}
  <div
    class="flex flex-col items-end leading-none tracking-wider whitespace-nowrap"
  >
    {#if totalOutflowBaseEquivalent && !totalOutflowBaseEquivalent.isZero()}
      <div
        class="flex gap-1 tracking-widest font-ponzi-number text-xs items-center"
      >
        <span class="flex opacity-80 text-red-400">
          <span>-$</span>
          {totalOutflowBaseEquivalent.rawValue().toNumber().toFixed(2)}
        </span>
        <span><TokenAvatar token={displayData.token} /></span>
      </div>
    {/if}
    <div class="flex items-center gap-1 leading-none">
      <span class="text-gray-400">-{displayData.amount.toString()}</span>
      <span class="text-gray-500">{displayData.token.symbol}</span>
    </div>
  </div>
{:else}
  <span class="text-gray-500">-</span>
{/if}
