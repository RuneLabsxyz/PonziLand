<script lang="ts">
  import accountState, { setup } from '$lib/account.svelte';
  import { useAccount } from '$lib/contexts/account.svelte';
  import { midgardAPI } from '$lib/midgard/api-store.svelte';
  import Nav from '$lib/midgard/components/Nav.svelte';
  import { Button } from '$lib/components/ui/button';
  import { onMount } from 'svelte';

  let { children } = $props();

  const account = useAccount();

  // Initialize account listeners on mount
  onMount(() => {
    setup();
  });

  // Auto-connect Midgard when PonziLand wallet connects
  $effect(() => {
    const address = accountState.address;
    if (accountState.isConnected && address) {
      if (!midgardAPI.isConnected && !midgardAPI.isLoading) {
        // Use IIFE to handle async in effect
        (async () => {
          try {
            console.log('Connecting Midgard with address:', address);
            await midgardAPI.connect(address);
            console.log('Midgard connected successfully');
          } catch (e) {
            console.error('Failed to connect Midgard:', e);
          }
        })();
      }
    } else if (!accountState.isConnected && midgardAPI.isConnected) {
      midgardAPI.disconnect();
    }
  });

  function handleConnectWallet() {
    account?.promptForLogin();
  }

  function handleDisconnect() {
    account?.disconnect();
  }
</script>

<div class="min-h-screen bg-[#1a1a2e] text-white">
  <!-- Header -->
  <header class="border-b border-gray-800 bg-black/40">
    <div class="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
      <!-- Logo -->
      <a href="/midgard" class="font-ponzi-number text-2xl text-purple-400">
        MIDGARD
      </a>

      <!-- Navigation (only show when connected) -->
      {#if midgardAPI.isConnected}
        <Nav />
      {/if}

      <!-- Wallet Section -->
      <div class="flex items-center gap-4">
        {#if accountState.isConnected && midgardAPI.isConnected}
          <!-- Connected State -->
          <div class="flex items-center gap-3">
            <div class="text-right">
              <div class="text-xs text-gray-500">Balance</div>
              <div class="font-ponzi-number text-lg text-green-400">
                {midgardAPI.walletBalance.toFixed(2)} GARD
              </div>
            </div>
            <div class="h-8 w-px bg-gray-700"></div>
            <div class="text-right">
              <div class="text-xs text-gray-500">Wallet</div>
              <div class="font-mono text-sm text-gray-300">
                {accountState.address?.slice(
                  0,
                  8,
                )}...{accountState.address?.slice(-6)}
              </div>
            </div>
            <Button variant="blue" size="sm" onclick={handleDisconnect}>
              Disconnect
            </Button>
          </div>
        {:else if accountState.isConnected && !midgardAPI.isConnected}
          <!-- PonziLand connected but Midgard loading -->
          <div class="flex items-center gap-2 text-gray-400">
            <span class="text-sm">Connecting to Midgard...</span>
          </div>
        {:else}
          <!-- Disconnected State -->
          <Button variant="blue" size="md" onclick={handleConnectWallet}>
            Connect Wallet
          </Button>
        {/if}
      </div>
    </div>
  </header>

  <!-- Error Banner -->
  {#if midgardAPI.error}
    <div class="bg-red-500/20 px-6 py-2 text-center text-sm text-red-400">
      {midgardAPI.error}
    </div>
  {/if}

  <!-- Main Content -->
  <main class="mx-auto max-w-7xl p-6">
    {#if accountState.isConnected && midgardAPI.isConnected}
      {@render children()}
    {:else if accountState.isConnected && !midgardAPI.isConnected}
      <!-- Loading Midgard -->
      <div class="flex min-h-[60vh] flex-col items-center justify-center">
        <div class="text-center">
          <h1 class="font-ponzi-number mb-4 text-4xl text-purple-400">
            Connecting to Midgard...
          </h1>
          <p class="text-gray-400">Setting up your Midgard wallet</p>
        </div>
      </div>
    {:else}
      <!-- Login Prompt -->
      <div class="flex min-h-[60vh] flex-col items-center justify-center">
        <div class="text-center">
          <h1 class="font-ponzi-number mb-4 text-4xl text-purple-400">
            Welcome to Midgard
          </h1>
          <p class="mb-8 max-w-md text-gray-400">
            Connect your wallet to start playing. You can create factories as a
            Tycoon or challenge existing factories as a Challenger.
          </p>
          <Button variant="blue" onclick={handleConnectWallet}>
            Connect Wallet
          </Button>
          <p class="mt-4 text-xs text-gray-600">
            New wallets are automatically created with 1000 GARD
          </p>
        </div>
      </div>
    {/if}
  </main>
</div>
