<script lang="ts">
  import type { Token } from '$lib/interfaces';
  import {
    getBaseToken,
    originalBaseToken,
    walletStore,
  } from '$lib/stores/wallet.svelte';
  import type { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import TokenAvatar from './token-avatar/token-avatar.svelte';

  let {
    price,
    token,
    showRate,
  }: { price: CurrencyAmount; token?: Token; showRate?: boolean } = $props();

  let formattedPrice = $derived.by(() => {
    // if zero return free
    if (price.isZero()) {
      return 'FREE';
    }
    // if not zero, format the price
    return price.toString();
  });

  let currentRate = $derived.by(() => {
    const landToken = token || originalBaseToken;
    const rate = walletStore.convertTokenAmount(
      price,
      landToken,
      getBaseToken(),
    );

    return rate;
  });

  const whiteChar = ['.', ',', ' ', 'K', 'M', 'B'];
</script>

<div class="flex gap-2 items-start">
  <div class="flex flex-col items-start">
    <div class="flex items-center gap-1 select-text">
      {#each formattedPrice as char}
        {#if whiteChar.includes(char)}
          <div class="text-ponzi-number stroke-display">{char}</div>
        {:else if char !== ' '}
          <div
            class="text-ponzi-number bg-[#2B2B3D] p-2 text-[#f2b545] stroke-display"
          >
            <span class="number-display-shadow">
              {char}
            </span>
          </div>
        {/if}
      {/each}
      {#if token}
        <TokenAvatar {token} class="w-8 h-8" />
      {/if}
    </div>

    {#if showRate}
      <div
        class="flex gap-1 items-center opacity-60 h-0 mt-4 mb-2 tracking-wide"
      >
        ${currentRate}
      </div>
    {/if}
  </div>
</div>

<style>
  .stroke-display {
    -webkit-text-stroke: 0;
    stroke: none;
  }

  .number-display-shadow {
    text-shadow: 0px 3px 0 #000;
  }
</style>
