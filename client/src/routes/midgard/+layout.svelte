<script lang="ts">
  import { midgardAPI } from '$lib/midgard/api-store.svelte';
  import Nav from '$lib/midgard/components/Nav.svelte';
  import { Input } from '$lib/components/ui/input';
  import { Button } from '$lib/components/ui/button';

  let { children } = $props();

  let walletInput = $state('');

  async function handleConnect() {
    if (!walletInput.trim()) return;
    try {
      await midgardAPI.connect(walletInput.trim());
    } catch (e) {
      console.error('Failed to connect:', e);
    }
  }

  function handleDisconnect() {
    midgardAPI.disconnect();
    walletInput = '';
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      handleConnect();
    }
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
        {#if midgardAPI.isConnected}
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
                {midgardAPI.walletAddress.slice(
                  0,
                  8,
                )}...{midgardAPI.walletAddress.slice(-6)}
              </div>
            </div>
            <Button variant="blue" size="sm" onclick={handleDisconnect}>
              Disconnect
            </Button>
          </div>
        {:else}
          <!-- Disconnected State -->
          <div class="flex items-center gap-2">
            <Input
              type="text"
              placeholder="Enter wallet address..."
              class="w-64 bg-gray-800 text-sm"
              bind:value={walletInput}
              onkeydown={handleKeydown}
            />
            <Button
              variant="blue"
              size="sm"
              onclick={handleConnect}
              disabled={midgardAPI.isLoading || !walletInput.trim()}
            >
              {midgardAPI.isLoading ? 'Connecting...' : 'Connect'}
            </Button>
          </div>
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
    {#if midgardAPI.isConnected}
      {@render children()}
    {:else}
      <!-- Login Prompt -->
      <div class="flex min-h-[60vh] flex-col items-center justify-center">
        <div class="text-center">
          <h1 class="font-ponzi-number mb-4 text-4xl text-purple-400">
            Welcome to Midgard
          </h1>
          <p class="mb-8 max-w-md text-gray-400">
            Enter your wallet address to start playing. You can create factories
            as a Tycoon or challenge existing factories as a Challenger.
          </p>
          <div class="flex items-center justify-center gap-2">
            <Input
              type="text"
              placeholder="Enter wallet address..."
              class="w-80 bg-gray-800"
              bind:value={walletInput}
              onkeydown={handleKeydown}
            />
            <Button
              variant="blue"
              onclick={handleConnect}
              disabled={midgardAPI.isLoading || !walletInput.trim()}
            >
              {midgardAPI.isLoading ? 'Connecting...' : 'Connect Wallet'}
            </Button>
          </div>
          <p class="mt-4 text-xs text-gray-600">
            New wallets are automatically created with 1000 GARD
          </p>
        </div>
      </div>
    {/if}
  </main>
</div>
