<script lang="ts">
  import { onDestroy } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import Input from '$lib/components/ui/input/input.svelte';
  import RotatingCoin from '$lib/components/loading-screen/rotating-coin.svelte';
  import BridgeSteps from './bridge-steps.svelte';
  import { bridgeStore } from '$lib/bridge/bridge-store.svelte';
  import type { WalletProvider, SolanaWalletAdapter } from '$lib/bridge/types';
  import { useSolanaAccount } from '$lib/bridge/solana-account.svelte';
  import { accountState } from '$lib/account.svelte';
  import { useDojo } from '$lib/contexts/dojo';
  import { notificationQueue } from '$lib/stores/event.store.svelte';
  import { Connection, VersionedTransaction } from '@solana/web3.js';
  import { PUBLIC_SOLANA_RPC_URL } from '$env/static/public';

  interface Props {
    selectedToken: string | null;
    transferDirection: 'toGame' | 'toSolana' | null;
    sourceBalance: string;
  }

  let { selectedToken, transferDirection, sourceBalance }: Props = $props();

  const { accountManager } = useDojo();
  const solanaAccount = useSolanaAccount();

  const SOLANA_RPC_URL =
    PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

  let amount = $state('');

  // Derived values
  const isToGame = $derived(transferDirection === 'toGame');
  const isToSolana = $derived(transferDirection === 'toSolana');

  const sourceChain = $derived(isToGame ? 'solanamainnet' : 'starknet');
  const destChain = $derived(isToGame ? 'starknet' : 'solanamainnet');

  const sourceWalletConnected = $derived(
    isToGame ? (solanaAccount?.isConnected ?? false) : accountState.isConnected,
  );

  const destWalletConnected = $derived(
    isToGame ? accountState.isConnected : (solanaAccount?.isConnected ?? false),
  );

  const sourceAddress = $derived(
    isToGame
      ? (solanaAccount?.walletAddress ?? '')
      : (accountState.address ?? ''),
  );

  const destAddress = $derived(
    isToGame
      ? (accountState.address ?? '')
      : (solanaAccount?.walletAddress ?? ''),
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
      getSolanaWallet: (): SolanaWalletAdapter | null => {
        if (isToGame) {
          const adapter = solanaAccount?.getAdapter();
          if (adapter && adapter.connected && adapter.publicKey) {
            const connection = new Connection(SOLANA_RPC_URL);
            return {
              connected: adapter.connected,
              publicKey: adapter.publicKey,
              signAndSendTransaction: async (tx, opts) => {
                // For VersionedTransaction, use sendTransaction
                const signature = await adapter.sendTransaction(
                  tx as VersionedTransaction,
                  connection,
                  { skipPreflight: opts?.skipPreflight ?? false },
                );
                return { signature };
              },
            };
          }
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
        amount = '';
      }
    } catch {
      // Error is handled by bridgeStore.transferError
    }
  }

  // Track previous values to detect actual changes (not just presence)
  let prevSelectedToken = $state<string | null>(null);
  let prevAmount = $state('');

  $effect(() => {
    if (bridgeStore.transferError) {
      if (selectedToken !== prevSelectedToken || amount !== prevAmount) {
        bridgeStore.clearError();
      }
    }
    prevSelectedToken = selectedToken;
    prevAmount = amount;
  });

  onDestroy(() => {
    bridgeStore.destroyTracker();
  });

  // Reset transfer state when delivery is complete and user starts new transfer
  function handleDismissComplete() {
    bridgeStore.reset();
    bridgeStore.resetRelay();
  }

  const showDismissButton = $derived(
    bridgeStore.relayStatus === 'delivered' ||
      bridgeStore.transferStatus === 'delivered',
  );
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

      <!-- Transfer progress steps -->
      <BridgeSteps
        status={bridgeStore.transferStatus}
        txHashes={bridgeStore.txHashes}
        {sourceChain}
        {destChain}
        error={bridgeStore.transferError}
        relayStatus={bridgeStore.relayStatus}
        destinationTxHash={bridgeStore.destinationTxHash}
      />

      <!-- Dismiss completed transfer button -->
      {#if showDismissButton}
        <button
          type="button"
          class="w-full py-2 px-4 text-sm font-medium bg-transparent text-gray-300 border border-[#ffffff33] rounded-md hover:bg-[#ffffff10] transition-colors"
          onclick={handleDismissComplete}
        >
          Start New Transfer
        </button>
      {/if}

      <!-- Transfer buttons -->
      {#if !showDismissButton}
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
      {/if}

      <!-- Connection warnings -->
      {#if !sourceWalletConnected}
        <div class="text-xs text-yellow-500 text-center">
          Connect {isToGame ? 'Solana' : 'Starknet'} wallet to transfer
        </div>
      {:else if !destWalletConnected}
        <div class="text-xs text-yellow-500 text-center">
          Connect {isToGame ? 'Starknet' : 'Solana'} wallet to receive tokens
        </div>
      {/if}
    </div>
  {/if}

  <!-- Footer -->
  <div
    class="text-xs text-gray-600 text-center mt-3 pt-3 border-t border-[#ffffff11]"
  >
    Powered by <a
      href="https://nexus.hyperlane.xyz/?origin=solanamainnet&destination=starknet"
      target="_blank">Hyperlane</a
    >
  </div>
</div>
