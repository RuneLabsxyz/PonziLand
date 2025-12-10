<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import Input from '$lib/components/ui/input/input.svelte';
  import RotatingCoin from '$lib/components/loading-screen/rotating-coin.svelte';
  import { bridgeStore } from '$lib/bridge/bridge-store.svelte';
  import type { WalletProvider } from '$lib/bridge/types';
  import { phantomWalletStore } from '$lib/bridge/phantom.svelte';
  import { accountState } from '$lib/account.svelte';
  import { useDojo } from '$lib/contexts/dojo';
  import { notificationQueue } from '$lib/stores/event.store.svelte';

  interface Props {
    selectedToken: string | null;
    transferDirection: 'toGame' | 'toSolana' | null;
    sourceBalance: string;
  }

  let { selectedToken, transferDirection, sourceBalance }: Props = $props();

  const { accountManager } = useDojo();

  let amount = $state('');

  // Derived values
  const isToGame = $derived(transferDirection === 'toGame');
  const isToSolana = $derived(transferDirection === 'toSolana');

  const sourceChain = $derived(isToGame ? 'solanamainnet' : 'starknet');
  const destChain = $derived(isToGame ? 'starknet' : 'solanamainnet');

  const sourceWalletConnected = $derived(
    isToGame ? phantomWalletStore.isConnected : accountState.isConnected,
  );

  const destWalletConnected = $derived(
    isToGame ? accountState.isConnected : phantomWalletStore.isConnected,
  );

  const sourceAddress = $derived(
    isToGame ? phantomWalletStore.walletAddress : (accountState.address ?? ''),
  );

  const destAddress = $derived(
    isToGame ? (accountState.address ?? '') : phantomWalletStore.walletAddress,
  );

  const canTransfer = $derived(
    selectedToken &&
      transferDirection &&
      sourceWalletConnected &&
      destWalletConnected &&
      amount &&
      parseFloat(amount) > 0 &&
      parseFloat(amount) <= parseFloat(sourceBalance || '0') &&
      !bridgeStore.isLoading,
  );

  function handleMaxClick() {
    if (sourceBalance) {
      amount = sourceBalance;
    }
  }

  async function handleTransfer() {
    if (
      !selectedToken ||
      !transferDirection ||
      !sourceAddress ||
      !destAddress
    ) {
      return;
    }

    const walletProvider: WalletProvider = {
      getStarknetAccount: () => {
        if (!isToGame) {
          return accountManager?.getProvider()?.getWalletAccount() ?? null;
        }
        return null;
      },
      getSolanaWallet: () => {
        if (isToGame && typeof window !== 'undefined') {
          return (window as any).solana ?? null;
        }
        return null;
      },
    };

    try {
      const result = await bridgeStore.executeTransfer(
        {
          originChain: sourceChain,
          destinationChain: destChain,
          tokenSymbol: selectedToken,
          amount,
          recipient: destAddress,
          sender: sourceAddress,
        },
        walletProvider,
      );

      if (result.success) {
        notificationQueue.addNotification(result.txHashes[0] ?? null, 'bridge');
        amount = ''; // Reset amount on success
      }
    } catch (err) {
      console.error('Transfer failed:', err);
    }
  }

  // Clear error when inputs change
  $effect(() => {
    if (bridgeStore.transferError && (selectedToken || amount)) {
      bridgeStore.clearError();
    }
  });
</script>

<div class="border border-[#ffffff33] rounded-lg bg-[#10101a]/50 p-4">
  {#if !selectedToken || !transferDirection}
    <div class="text-center text-gray-500 py-4">
      Select a token from either wallet to transfer
    </div>
  {:else}
    <div class="flex flex-col gap-3">
      <!-- Direction indicator -->
      <div class="flex items-center justify-center gap-2 text-sm text-gray-400">
        {#if isToGame}
          <span>Solana</span>
          <span class="text-cyan-400">→</span>
          <span class="text-cyan-400 font-medium">Game</span>
        {:else}
          <span class="text-cyan-400 font-medium">Game</span>
          <span class="text-cyan-400">→</span>
          <span>Solana</span>
        {/if}
      </div>

      <!-- Amount input -->
      <div class="flex gap-2 items-center">
        <div class="flex-1 relative">
          <Input
            type="number"
            class="w-full bg-[#282835] text-white pr-20"
            bind:value={amount}
            placeholder="0.00"
          />
          <div
            class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2"
          >
            <span class="text-gray-400 text-sm">{selectedToken}</span>
          </div>
        </div>
        <button
          type="button"
          class="px-3 py-1 text-sm bg-[#282835] text-gray-300 rounded border border-[#ffffff33] hover:bg-[#3a3a4a] transition-colors"
          onclick={handleMaxClick}
        >
          MAX
        </button>
      </div>

      <!-- Balance info -->
      <div class="flex justify-between text-xs text-gray-500">
        <span>Available: {sourceBalance} {selectedToken}</span>
        {#if amount && parseFloat(amount) > 0}
          <span>You will receive: ~{amount} {selectedToken}</span>
        {/if}
      </div>

      <!-- Transfer status -->
      {#if bridgeStore.transferStatus !== 'idle'}
        <div
          class="p-2 rounded text-sm {bridgeStore.transferStatus === 'success'
            ? 'bg-green-900/20 text-green-400'
            : bridgeStore.transferStatus === 'error'
              ? 'bg-red-900/20 text-red-400'
              : 'bg-blue-900/20 text-blue-400'}"
        >
          {#if bridgeStore.transferStatus === 'fetching_quote' || bridgeStore.transferStatus === 'building_tx'}
            <div class="flex items-center gap-2">
              <RotatingCoin />
              <span>Preparing transfer...</span>
            </div>
          {:else if bridgeStore.transferStatus === 'signing'}
            <div class="flex items-center gap-2">
              <RotatingCoin />
              <span>Please sign in your wallet...</span>
            </div>
          {:else if bridgeStore.transferStatus === 'sending'}
            <div class="flex items-center gap-2">
              <RotatingCoin />
              <span>Transferring...</span>
            </div>
          {:else if bridgeStore.transferStatus === 'success'}
            <span>Transfer successful!</span>
          {/if}
        </div>
      {/if}

      <!-- Error display -->
      {#if bridgeStore.transferError}
        <div class="p-2 rounded bg-red-900/20 text-red-400 text-sm">
          {bridgeStore.transferError}
        </div>
      {/if}

      <!-- Transfer buttons -->
      <div class="flex gap-2">
        {#if isToSolana}
          <Button
            class="flex-1"
            onclick={handleTransfer}
            disabled={!canTransfer}
          >
            {#if bridgeStore.isLoading}
              <span class="flex items-center gap-2">
                <RotatingCoin />
                Processing...
              </span>
            {:else}
              ← Transfer to Solana
            {/if}
          </Button>
        {:else}
          <Button
            class="flex-1"
            onclick={handleTransfer}
            disabled={!canTransfer}
          >
            {#if bridgeStore.isLoading}
              <span class="flex items-center gap-2">
                <RotatingCoin />
                Processing...
              </span>
            {:else}
              Transfer to Game →
            {/if}
          </Button>
        {/if}
      </div>

      <!-- Connection warnings -->
      {#if !sourceWalletConnected}
        <div class="text-xs text-yellow-500 text-center">
          Connect {isToGame ? 'Phantom' : 'Starknet'} wallet to transfer
        </div>
      {:else if !destWalletConnected}
        <div class="text-xs text-yellow-500 text-center">
          Connect {isToGame ? 'Starknet' : 'Phantom'} wallet to receive tokens
        </div>
      {/if}
    </div>
  {/if}

  <!-- Footer -->
  <div
    class="text-xs text-gray-600 text-center mt-3 pt-3 border-t border-[#ffffff11]"
  >
    Powered by Hyperlane
  </div>
</div>
