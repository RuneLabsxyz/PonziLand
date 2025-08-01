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
    <Card>
      <div class="flex flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <img src="/phantom-icon.svg" alt="Phantom" class="w-6 h-6" />
          <p>{walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}</p>
        </div>

        <button
          onclick={() => phantomWalletStore.disconnect()}
          aria-label="Logout"
          class="flex items-center"
        >
          <img src="/ui/icons/logout.png" alt="logout" class="h-5 w-5" />
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
