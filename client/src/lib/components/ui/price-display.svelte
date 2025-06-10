<script lang="ts">
  import type { Token } from '$lib/interfaces';
  import type { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import TokenAvatar from './token-avatar/token-avatar.svelte';

  let { price, token }: { price: CurrencyAmount; token?: Token } = $props();

  let formattedPrice = $derived.by(() => {
    // if zero return free
    if (price.isZero()) {
      return 'FREE';
    }
    // if not zero, format the price
    return price.toString();
  });
</script>

<div class="flex gap-2 items-center">
  <div class="flex items-center gap-1 select-text">
    {#each formattedPrice as char}
      {#if char === '.'}
        <div class="text-ponzi-number">.</div>
      {:else if char !== ' '}
        <div class="text-ponzi-number bg-[#2B2B3D] p-2 text-[#f2b545]">
          {char}
        </div>
      {/if}
    {/each}
  </div>
  {#if token}
    <TokenAvatar {token} class="w-8 h-8" />
  {/if}
</div>
