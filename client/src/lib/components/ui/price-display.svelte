<script lang="ts">
  import type { Token } from '$lib/interfaces';
  import type { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import TokenAvatar from './token-avatar/token-avatar.svelte';

  let { price, token }: { price: CurrencyAmount; token?: Token } = $props();
</script>

<div class="flex gap-2 items-center">
  <div class="flex items-center gap-1 select-text">
    {#each price.toString() as char}
      {#if char === '.'}
        <div class="text-ponzi-number text-3xl">.</div>
      {:else if char !== ' '}
        <div class="text-ponzi-number text-3xl bg-[#2B2B3D] p-2 text-[#f2b545]">
          {char}
        </div>
      {/if}
    {/each}
  </div>
  {#if token}
    <TokenAvatar {token} class="w-8 h-8" />
  {/if}
</div>
