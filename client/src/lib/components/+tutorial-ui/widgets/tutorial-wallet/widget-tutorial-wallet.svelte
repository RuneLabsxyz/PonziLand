<script lang="ts">
  import { tutorialWalletStore } from '$lib/stores/tutorial-wallet.store.svelte';
  import { tutorialStore } from '$lib/stores/tutorial.store.svelte';

  let tokens = $derived(tutorialWalletStore.tokens);
  let selectedToken = $derived(tutorialWalletStore.selectedToken);
  let isHighlighted = $derived(
    tutorialStore.currentStep?.targetElement === 'wallet-widget',
  );
</script>

<div
  class="bg-gray-900/95 backdrop-blur-sm border rounded-lg shadow-lg p-4 w-64
         {isHighlighted
    ? 'border-yellow-400 animate-pulse'
    : 'border-gray-700'}"
>
  <h3 class="text-white font-bold mb-3 flex items-center gap-2">
    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path
        d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"
      />
    </svg>
    Tutorial Wallet
  </h3>

  <!-- Mock address -->
  <div class="text-xs text-gray-400 mb-3 font-mono">
    {tutorialWalletStore.address.slice(
      0,
      6,
    )}...{tutorialWalletStore.address.slice(-4)}
  </div>

  <!-- Token balances -->
  <div class="space-y-2">
    {#each tokens as token (token.symbol)}
      <button
        class="w-full p-3 rounded transition-colors text-left
               {selectedToken?.symbol === token.symbol
          ? 'bg-blue-600/20 border border-blue-500'
          : 'bg-gray-800/50 hover:bg-gray-800 border border-gray-700'}"
        onclick={() => tutorialWalletStore.selectToken(token.symbol)}
      >
        <div class="flex justify-between items-center">
          <span class="text-white font-medium">{token.symbol}</span>
          <span class="text-white/80">{token.balance.toLocaleString()}</span>
        </div>
      </button>
    {/each}
  </div>

  <!-- Selected token indicator -->
  {#if selectedToken}
    <div class="mt-3 pt-3 border-t border-gray-700">
      <div class="text-xs text-gray-400">Selected for transactions:</div>
      <div class="text-white font-medium">{selectedToken.name}</div>
    </div>
  {/if}
</div>
