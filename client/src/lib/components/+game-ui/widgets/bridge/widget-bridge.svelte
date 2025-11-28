<script lang="ts">
  import {
    hyperlaneStore,
    tokenTransferStore,
    type Token,
    type WalletProvider,
  } from '@ponziland/hyperlane-bridge';

  import RotatingCoin from '$lib/components/loading-screen/rotating-coin.svelte';
  import Button from '$lib/components/ui/button/button.svelte';
  import Input from '$lib/components/ui/input/input.svelte';
  import { useDojo } from '$lib/contexts/dojo';
  import { accountState } from '$lib/account.svelte';
  import { phantomWalletStore } from '$lib/bridge/phantom.svelte';
  import { notificationQueue } from '$lib/stores/event.store.svelte';
  import { onMount } from 'svelte';

  let { accountManager } = useDojo();

  // Form state
  let originChain = $state('solanamainnet');
  let destinationChain = $state('starknet');
  let tokenSymbol = $state('');
  let amount = $state('');
  let recipient = $state('');

  let balance = $state<string | null>(null);
  let balanceLoading = $state(false);

  // Derived: Available chains from warpCore
  const availableChains = $derived(
    hyperlaneStore.warpCore
      ? Array.from(
          new Set(
            hyperlaneStore.warpCore.tokens.map((t: Token) => t.chainName),
          ),
        )
      : [],
  );

  // Derived: Available tokens for selected origin chain
  const availableTokens = $derived(
    hyperlaneStore.warpCore && originChain
      ? Array.from(
          new Set(
            hyperlaneStore.warpCore.tokens
              .filter((t: Token) => t.chainName === originChain)
              .map((t: Token) => t.symbol),
          ),
        )
      : [],
  );

  // Detect chain types
  const isStarknetOrigin = $derived(
    originChain &&
      (originChain.toLowerCase().includes('starknet') ||
        originChain === 'sepolia' ||
        originChain === 'mainnet'),
  );

  const isSolanaOrigin = $derived(
    originChain &&
      (originChain.toLowerCase().includes('solana') ||
        originChain === 'solana'),
  );

  // Check connection status based on origin chain
  const isConnected = $derived(
    isStarknetOrigin
      ? accountState.isConnected
      : isSolanaOrigin
        ? phantomWalletStore.isConnected
        : false,
  );

  const connectedAddress = $derived(
    isStarknetOrigin
      ? accountState.address
      : isSolanaOrigin
        ? phantomWalletStore.walletAddress
        : null,
  );

  // Sender address based on origin chain
  const senderAddress = $derived(connectedAddress ?? '');

  // Auto-fill recipient with Starknet address when bridging TO Starknet
  const isStarknetDestination = $derived(
    destinationChain &&
      (destinationChain.toLowerCase().includes('starknet') ||
        destinationChain === 'sepolia' ||
        destinationChain === 'mainnet'),
  );

  // Auto-fill recipient when bridging to Starknet and Starknet wallet is connected
  $effect(() => {
    if (isStarknetDestination && accountState.address && !recipient) {
      recipient = accountState.address;
    }
  });

  // Initialize Phantom on mount if needed
  onMount(async () => {
    if (isSolanaOrigin) {
      await phantomWalletStore.initialize();
    }
  });

  // Fetch balance when conditions are met
  $effect(() => {
    if (originChain && tokenSymbol && senderAddress) {
      fetchBalance();
    } else {
      balance = null;
    }
  });

  async function fetchBalance() {
    balanceLoading = true;
    try {
      const tokenBalance = await tokenTransferStore.getTokenBalance(
        originChain,
        tokenSymbol,
        senderAddress,
      );

      if (tokenBalance) {
        balance = String(tokenBalance.getDecimalFormattedAmount());
      } else {
        balance = null;
      }
    } catch (err) {
      console.error('Error fetching balance:', err);
      balance = null;
    } finally {
      balanceLoading = false;
    }
  }

  async function handleConnectWallet() {
    if (!originChain) {
      return;
    }

    if (isStarknetOrigin) {
      await accountManager?.promptForLogin();
    } else if (isSolanaOrigin) {
      await phantomWalletStore.connect({ forcePrompt: true });
    }
  }

  async function handleDisconnect() {
    if (isStarknetOrigin) {
      accountManager?.disconnect();
    } else if (isSolanaOrigin) {
      await phantomWalletStore.disconnect();
    }
  }

  function handleSwapChains() {
    const temp = originChain;
    originChain = destinationChain;
    destinationChain = temp;
    tokenSymbol = '';
    amount = '';
    balance = null;
  }

  async function handleTransfer() {
    if (!senderAddress) {
      return;
    }

    const walletProvider: WalletProvider = {
      getStarknetAccount: () => {
        if (isStarknetOrigin) {
          return accountManager?.getProvider()?.getWalletAccount() ?? null;
        }
        return null;
      },
      getSolanaWallet: () => {
        if (isSolanaOrigin && typeof window !== 'undefined') {
          return (window as any).solana ?? null;
        }
        return null;
      },
    };

    try {
      const result = await tokenTransferStore.executeTransfer(
        {
          originChain,
          destinationChain,
          tokenSymbol,
          amount,
          recipient,
          sender: senderAddress,
        },
        walletProvider,
      );

      if (result.success) {
        notificationQueue.addNotification(result.txHashes[0] ?? null, 'bridge');
      }
    } catch (err) {
      console.error('Transfer failed:', err);
    }
  }

  // Clear error when form data changes
  $effect(() => {
    if (tokenTransferStore.error && (originChain || tokenSymbol || amount)) {
      tokenTransferStore.clearError();
    }
  });

  const isFormValid = $derived(
    originChain &&
      destinationChain &&
      tokenSymbol &&
      amount &&
      Number(amount) > 0 &&
      recipient &&
      senderAddress,
  );

  const canSubmit = $derived(
    isFormValid && !tokenTransferStore.isLoading && isConnected,
  );
</script>

<div class="flex flex-col gap-3">
  {#if !hyperlaneStore.isReady}
    <div class="flex items-center justify-center py-8">
      <RotatingCoin />
      <span class="ml-2 text-gray-400">Initializing bridge...</span>
    </div>
  {:else if hyperlaneStore.error}
    <div class="p-3 bg-red-800/20 rounded text-red-400 text-sm">
      Bridge initialization error: {hyperlaneStore.error}
    </div>
  {:else}
    <!-- Origin Chain Section -->
    <div class="flex flex-col gap-2 rounded border border-[#ffffff55] p-3">
      <div class="flex justify-between items-center">
        <span class="text-sm text-gray-400">From</span>
        {#if isConnected && connectedAddress}
          <div class="flex items-center gap-2 text-sm">
            <span class="text-green-400">Connected</span>
            <span class="text-gray-400 font-mono">
              {connectedAddress.slice(0, 6)}...{connectedAddress.slice(-4)}
            </span>
            <button
              type="button"
              class="text-red-400 hover:text-red-300 text-xs"
              onclick={handleDisconnect}
            >
              Disconnect
            </button>
          </div>
        {/if}
      </div>

      <div class="flex gap-2">
        <select
          bind:value={originChain}
          class="flex-1 bg-[#282835] text-white rounded p-2 border border-[#ffffff33]"
        >
          <option value="">Select chain</option>
          {#each availableChains as chain}
            <option value={chain}>{chain}</option>
          {/each}
        </select>

        <select
          bind:value={tokenSymbol}
          class="flex-1 bg-[#282835] text-white rounded p-2 border border-[#ffffff33]"
          disabled={!originChain}
        >
          <option value="">Select token</option>
          {#each availableTokens as token}
            <option value={token}>{token}</option>
          {/each}
        </select>
      </div>

      {#if !isConnected && originChain}
        <Button class="w-full" onclick={handleConnectWallet}>
          {#if isStarknetOrigin}
            Connect Starknet Wallet
          {:else if isSolanaOrigin}
            Connect Phantom Wallet
          {:else}
            Connect Wallet
          {/if}
        </Button>
      {/if}

      <div class="flex gap-2 items-center">
        <Input
          type="number"
          class="flex-1 bg-[#282835] text-white rounded"
          bind:value={amount}
          placeholder="0.00"
          disabled={!isConnected || !tokenSymbol}
        />
      </div>

      {#if tokenSymbol && isConnected}
        <div class="flex justify-end text-sm">
          {#if balanceLoading}
            <span class="text-gray-400">Loading balance...</span>
          {:else if balance}
            <span class="text-gray-400">
              Balance: <span class="text-white">{balance} {tokenSymbol}</span>
            </span>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Swap Button -->
    <div class="flex justify-center -my-1 z-10">
      <button
        type="button"
        class="cursor-pointer hover:rotate-180 transition-transform p-1 bg-[#10101A] rounded-full border border-[#57575E]"
        onclick={handleSwapChains}
        aria-label="Swap chains"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M8 4L8 16M8 4L4 8M8 4L12 8M16 20L16 8M16 20L20 16M16 20L12 16"
            stroke="white"
            stroke-opacity="0.5"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>

    <!-- Destination Chain Section -->
    <div class="flex flex-col gap-2 rounded border border-[#ffffff55] p-3">
      <span class="text-sm text-gray-400">To</span>

      <select
        bind:value={destinationChain}
        class="w-full bg-[#282835] text-white rounded p-2 border border-[#ffffff33]"
      >
        <option value="">Select chain</option>
        {#each availableChains as chain}
          <option value={chain}>{chain}</option>
        {/each}
      </select>

      <div class="flex flex-col gap-1">
        <span class="text-sm text-gray-400">Recipient Address</span>
        <Input
          type="text"
          class="w-full bg-[#282835] text-white rounded"
          bind:value={recipient}
          placeholder="0x..."
        />
        {#if isStarknetDestination && accountState.address}
          <button
            type="button"
            class="text-xs text-blue-400 hover:text-blue-300 text-left"
            onclick={() => (recipient = accountState.address ?? '')}
          >
            Use connected Starknet address
          </button>
        {/if}
      </div>
    </div>

    <!-- Transfer Status -->
    {#if tokenTransferStore.status !== 'idle'}
      <div
        class="p-3 rounded border {tokenTransferStore.status === 'success'
          ? 'border-green-500/50 bg-green-900/20'
          : tokenTransferStore.status === 'error'
            ? 'border-red-500/50 bg-red-900/20'
            : 'border-blue-500/50 bg-blue-900/20'}"
      >
        {#if tokenTransferStore.status === 'preparing'}
          <div class="flex items-center gap-2">
            <RotatingCoin />
            <span class="text-blue-400">Preparing transfer...</span>
          </div>
        {:else if tokenTransferStore.status === 'approving'}
          <div class="flex items-center gap-2">
            <RotatingCoin />
            <span class="text-yellow-400">Approving token...</span>
          </div>
        {:else if tokenTransferStore.status === 'transferring'}
          <div class="flex items-center gap-2">
            <RotatingCoin />
            <span class="text-purple-400">Transferring...</span>
          </div>
        {:else if tokenTransferStore.status === 'success'}
          <div class="text-green-400">
            Transfer successful!
            {#if tokenTransferStore.txHashes.length > 0}
              <div class="mt-1 text-sm text-gray-400">
                {#each tokenTransferStore.txHashes as hash}
                  <div class="font-mono">
                    Tx: {hash.slice(0, 10)}...{hash.slice(-8)}
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      </div>
    {/if}

    <!-- Error Display -->
    {#if tokenTransferStore.error}
      <div class="p-3 bg-red-800/20 rounded text-red-400 text-sm">
        {tokenTransferStore.error}
      </div>
    {/if}

    <!-- Transfer Button -->
    <Button class="w-full" onclick={handleTransfer} disabled={!canSubmit}>
      {#if tokenTransferStore.isLoading}
        <span class="flex items-center gap-2">
          <RotatingCoin />
          Processing...
        </span>
      {:else if !isConnected}
        Connect Wallet
      {:else}
        Bridge Tokens
      {/if}
    </Button>

    <!-- Info -->
    <div class="text-xs text-gray-500 text-center">
      Powered by Hyperlane. Cross-chain transfers may take a few minutes.
    </div>
  {/if}
</div>
