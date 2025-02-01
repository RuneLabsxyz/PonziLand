<script lang="ts">
  import SwapModal from '$lib/components/swap/swap-modal.svelte';
  import type { Token } from '$lib/interfaces';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';

  let { amount, token } = $props<{
    amount: bigint;
    token: Token;
  }>();

  let showSwap = $state(false);
</script>

<div class="flex flex-col items-end">
  <div class="flex gap-2 items-center">
    <div class="amount">
      {CurrencyAmount.fromUnscaled(amount, token.decimals)}
    </div>
    <div class="font-bold text-right">{token.symbol}</div>
    <button onclick={() => (showSwap = true)}>Swap</button>
  </div>
</div>

{#if showSwap}
  <SwapModal sellToken={token} bind:visible={showSwap} />
{/if}

<style>
  .amount {
    text-shadow: none;
  }
</style>
