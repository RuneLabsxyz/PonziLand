<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Wallet, RefreshCw, Coins, DollarSign } from 'lucide-svelte';
  import { phantomWalletStore } from '$lib/stores/phantom-wallet.store.svelte';
  import { onMount } from 'svelte';
  import WalletAddress from '$lib/components/ui/wallet-address/wallet-address.svelte';

  const isConnected = $derived(phantomWalletStore.isConnected);
  const walletAddress = $derived(phantomWalletStore.walletAddress);
  const loading = $derived(phantomWalletStore.loading);
  const tokenBalances = $derived(phantomWalletStore.tokenBalances);

  let refreshing = $state(false);

  async function refreshBalance() {
    refreshing = true;
    await phantomWalletStore.fetchBalance();
    refreshing = false;
  }

  onMount(async () => {
    // Initialize and check connection on mount
    await phantomWalletStore.initialize();
  });
</script>

<div class="h-full flex flex-col">
  {#if !isConnected}
    <div class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <div class="p-4 bg-purple-700/50 rounded-lg mb-4 mx-auto w-fit">
          <Wallet class="w-12 h-12 text-purple-400" />
        </div>
        <h3 class="text-xl font-semibold text-white mb-2">
          Connect Phantom Wallet
        </h3>
        <p class="text-gray-400 mb-6">
          View your Solana balance and manage your assets
        </p>
        <Button
          onclick={() => phantomWalletStore.connect()}
          disabled={loading}
          class="gap-2"
        >
          {#if loading}
            <div
              class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"
            ></div>
            Connecting...
          {:else}
            <Wallet class="w-4 h-4" />
            Connect Phantom
          {/if}
        </Button>
      </div>
    </div>
  {:else}
    <div class="space-y-6">
      <!-- Wallet Header -->
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-gray-400 mb-1">Phantom Wallet</p>
          <WalletAddress address={walletAddress} class="text-white text-lg" />
        </div>
        <div class="flex gap-2">
          <Button
            size="sm"
            onclick={refreshBalance}
            disabled={refreshing}
            class="text-gray-400 hover:text-white"
          >
            <RefreshCw class={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            size="sm"
            onclick={() => phantomWalletStore.disconnect()}
            class="text-gray-400 hover:text-white"
          >
            Disconnect
          </Button>
        </div>
      </div>

      <!-- Total Portfolio Value -->
      <div
        class="p-6 bg-gradient-to-br from-purple-700/20 to-purple-900/20 rounded-lg border border-purple-700/30"
      >
        <p class="text-sm text-gray-400 mb-2">Total Portfolio Value</p>
        <p class="text-3xl font-bold text-white">
          ${(tokenBalances && tokenBalances.length > 0
            ? tokenBalances.reduce((sum, tb) => sum + tb.balanceUSD, 0)
            : 0
          ).toFixed(2)}
        </p>
      </div>

      <!-- Token List -->
      <div class="space-y-3">
        <h3 class="text-lg font-semibold text-white mb-3">Token Balances</h3>

        {#if !tokenBalances || tokenBalances.length === 0}
          <div class="text-center py-8 text-gray-500">
            Loading token balances...
          </div>
        {:else}
          {#each tokenBalances as tokenBalance}
            <div
              class="p-4 bg-gray-900/50 rounded-lg hover:bg-gray-900/70 transition-colors"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <!-- Token Icon -->
                  <div
                    class="w-10 h-10 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center"
                  >
                    {#if tokenBalance.token.images.icon.startsWith('http')}
                      <img
                        src={tokenBalance.token.images.icon}
                        alt={tokenBalance.token.symbol}
                        class="w-full h-full object-cover"
                      />
                      <div
                        class="hidden items-center justify-center w-full h-full text-xs font-bold text-gray-400"
                      >
                        {tokenBalance.token.symbol.slice(0, 2)}
                      </div>
                    {:else}
                      <img
                        src={tokenBalance.token.images.icon}
                        alt={tokenBalance.token.symbol}
                        class="w-full h-full object-cover"
                      />
                    {/if}
                  </div>

                  <!-- Token Info -->
                  <div>
                    <p class="font-semibold text-white">
                      {tokenBalance.token.name}
                    </p>
                    <p class="text-sm text-gray-400">
                      {tokenBalance.token.symbol}
                    </p>
                  </div>
                </div>

                <!-- Balance Info -->
                <div class="text-right">
                  <p class="font-semibold text-white">
                    {tokenBalance.balance.toFixed(
                      tokenBalance.token.decimals === 9 ? 4 : 2,
                    )}
                  </p>
                  <p class="text-sm text-gray-400">
                    ${tokenBalance.balanceUSD.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          {/each}
        {/if}
      </div>

      <!-- Actions -->
      <div class="grid grid-cols-2 gap-4 mt-6">
        <Button variant="red" disabled class="w-full">Send</Button>
        <Button variant="red" disabled class="w-full">Receive</Button>
      </div>

      <p class="text-xs text-gray-500 text-center">
        Send and receive functionality coming soon
      </p>
    </div>
  {/if}
</div>
