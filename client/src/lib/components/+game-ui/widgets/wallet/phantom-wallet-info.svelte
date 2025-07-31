<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Wallet as WalletIcon } from 'lucide-svelte';
  import Card from '$lib/components/ui/card/card.svelte';
  import { phantomWalletStore } from '$lib/stores/phantom-wallet.store.svelte';
  import { onMount } from 'svelte';

  const isConnected = $derived(phantomWalletStore.isConnected);
  const walletAddress = $derived(phantomWalletStore.walletAddress);
  const loading = $derived(phantomWalletStore.loading);

  onMount(() => {
    // Initialize and check connection on mount
    phantomWalletStore.initialize();
  });
</script>

<div>
  {#if isConnected}
    <Card class="">
      <div class="flex flex-row items-center gap-3 px-3 py-2">
        <img src="/phantom-icon.svg" alt="Phantom" class="w-5 h-5" />
        <p class="text-sm">
          <span class="font-mono">
            {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
          </span>
        </p>
        <button
          onclick={() => phantomWalletStore.disconnect()}
          class="ml-2 text-gray-400 hover:text-white transition-colors"
          aria-label="Disconnect Phantom"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </Card>
  {:else}
    <Button
      onclick={() => phantomWalletStore.connect()}
      disabled={loading}
      class="gap-2"
    >
      {#if loading}
        <div
          class="animate-spin rounded-full h-3 w-3 border-b-2 border-white"
        ></div>
      {:else}
        <WalletIcon class="w-4 h-4" />
      {/if}
      Connect Phantom
    </Button>
  {/if}
</div>
