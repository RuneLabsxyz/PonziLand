<!-- TransferForm.svelte -->
<script lang="ts">
  // Import bridge store (NO Hyperlane SDK)
  import { bridgeStore } from './bridge-store.svelte';
  import type { WalletProvider, TokenInfo } from './types';

  // Import account management
  import { useAccount } from '$lib/contexts/account.svelte';
  import { accountState } from '$lib/account.svelte';
  import { phantomWalletStore } from './phantom.svelte';

  // Form state
  let formData = $state({
    originChain: '',
    destinationChain: '',
    tokenSymbol: '',
    amount: '',
    recipient: '',
    sender: '',
  });

  let balance = $state<string | null>(null);
  let balanceLoading = $state(false);

  const accountManager = useAccount();

  // Load config on mount
  $effect(() => {
    bridgeStore.loadConfig().catch((err) => {
      console.error('Failed to load bridge config:', err);
    });
  });

  // Derived values from bridge config
  const availableChains = $derived(
    bridgeStore.config
      ? Array.from(
          new Set(bridgeStore.config.tokens.map((t: TokenInfo) => t.chainName)),
        )
      : [],
  );

  const availableTokens = $derived(
    bridgeStore.config && formData.originChain
      ? bridgeStore.config.tokens
          .filter((t: TokenInfo) => t.chainName === formData.originChain)
          .map((t: TokenInfo) => t.symbol)
      : [],
  );

  // Detect chain type
  const isStarknet = $derived(
    formData.originChain &&
      (formData.originChain.toLowerCase().includes('starknet') ||
        formData.originChain === 'sepolia' ||
        formData.originChain === 'mainnet'),
  );

  const isSolana = $derived(
    formData.originChain &&
      (formData.originChain.toLowerCase().includes('solana') ||
        formData.originChain === 'solana'),
  );

  // Check connection status
  const isConnected = $derived(
    isStarknet
      ? accountState.isConnected
      : isSolana
        ? phantomWalletStore.isConnected
        : false,
  );

  const connectedAddress = $derived(
    isStarknet
      ? accountState.address
      : isSolana
        ? phantomWalletStore.walletAddress
        : null,
  );

  // Debug logging
  $effect(() => {
    console.log('🔍 Debug Bridge State:', {
      originChain: formData.originChain,
      isStarknet,
      accountStateConnected: accountState.isConnected,
      accountStateAddress: accountState.address,
      isConnected,
      connectedAddress,
      sender: formData.sender,
    });
  });

  // Update sender when wallet connects
  $effect(() => {
    if (connectedAddress) {
      formData.sender = connectedAddress;
    } else {
      formData.sender = '';
    }
  });

  // Fetch balance when conditions met
  $effect(() => {
    if (formData.originChain && formData.tokenSymbol && formData.sender) {
      fetchBalance();
    } else {
      balance = null;
    }
  });

  async function fetchBalance() {
    balanceLoading = true;
    try {
      const tokenBalance = await bridgeStore.getBalance(
        formData.originChain,
        formData.tokenSymbol,
        formData.sender,
      );

      if (tokenBalance) {
        balance = tokenBalance.formatted;
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
    if (!formData.originChain) {
      alert('Please select an origin chain first');
      return;
    }

    if (isStarknet) {
      await accountManager?.promptForLogin();
    } else if (isSolana) {
      await phantomWalletStore.connect({ forcePrompt: true });
    } else {
      alert('Unsupported chain. Please use Starknet or Solana.');
    }
  }

  async function handleDisconnect() {
    if (isStarknet) {
      accountManager?.disconnect();
    } else if (isSolana) {
      await phantomWalletStore.disconnect();
    }
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();

    if (!formData.sender) {
      alert('Please connect your wallet first');
      return;
    }

    // Create wallet provider for the transfer
    const walletProvider: WalletProvider = {
      getStarknetAccount: () => {
        if (isStarknet) {
          return accountManager?.getProvider()?.getWalletAccount() ?? null;
        }
        return null;
      },
      getSolanaWallet: () => {
        if (isSolana && typeof window !== 'undefined') {
          return (window as any).solana ?? null;
        }
        return null;
      },
    };

    try {
      const result = await bridgeStore.executeTransfer(
        formData,
        walletProvider,
      );

      if (result.success) {
        console.log('Transfer successful!', result.txHashes);
      } else {
        console.error('Transfer failed:', result.error);
      }
    } catch (err) {
      console.error('Transfer failed:', err);
    }
  }

  // Clear error when form data changes
  $effect(() => {
    if (bridgeStore.transferError) {
      bridgeStore.clearError();
    }
  });
</script>

{#if !bridgeStore.isReady}
  <div class="loading">
    {#if bridgeStore.isLoading}
      Loading Bridge Config...
    {:else if bridgeStore.configError}
      Error: {bridgeStore.configError}
    {:else}
      Initializing...
    {/if}
  </div>
{:else}
  <form onsubmit={handleSubmit} class="space-y-4">
    <div>
      <label for="originChain">Origin Chain:</label>
      <select id="originChain" bind:value={formData.originChain}>
        <option value="">Select Chain</option>
        {#each availableChains as chain}
          <option value={chain}>{chain}</option>
        {/each}
      </select>
    </div>

    <!-- Wallet Connection -->
    {#if formData.originChain}
      <div class="wallet-section">
        {#if isConnected && connectedAddress}
          <div class="connected">
            <span class="label">Connected:</span>
            <span class="address"
              >{connectedAddress.slice(0, 6)}...{connectedAddress.slice(
                -4,
              )}</span
            >
            <button
              type="button"
              onclick={handleDisconnect}
              class="disconnect-btn"
            >
              Disconnect
            </button>
          </div>
        {:else}
          <button
            type="button"
            onclick={handleConnectWallet}
            class="connect-btn"
          >
            {#if isStarknet}
              Connect Starknet Wallet
            {:else if isSolana}
              Connect Phantom
            {:else}
              Connect Wallet
            {/if}
          </button>
        {/if}
      </div>
    {/if}

    <div>
      <label for="destinationChain">Destination Chain:</label>
      <select id="destinationChain" bind:value={formData.destinationChain}>
        <option value="">Select Chain</option>
        {#each availableChains as chain}
          <option value={chain}>{chain}</option>
        {/each}
      </select>
    </div>

    <div>
      <label for="tokenSymbol">Token:</label>
      <select id="tokenSymbol" bind:value={formData.tokenSymbol}>
        <option value="">Select Token</option>
        {#each availableTokens as token}
          <option value={token}>{token}</option>
        {/each}
      </select>

      <!-- Balance Display -->
      {#if formData.tokenSymbol && isConnected}
        <div class="balance-display">
          {#if balanceLoading}
            <span class="balance-loading">Loading balance...</span>
          {:else if balance}
            <span class="balance-label">Balance:</span>
            <span class="balance-value">{balance} {formData.tokenSymbol}</span>
          {:else}
            <span class="balance-error">Unable to fetch balance</span>
          {/if}
        </div>
      {/if}
    </div>

    <div>
      <label for="amount">Amount:</label>
      <input
        id="amount"
        type="number"
        step="any"
        bind:value={formData.amount}
        placeholder="0.0"
      />
    </div>

    <div>
      <label for="recipient">Recipient Address:</label>
      <input
        id="recipient"
        type="text"
        bind:value={formData.recipient}
        placeholder="0x..."
      />
    </div>

    <!-- Transfer Status -->
    {#if bridgeStore.transferStatus !== 'idle'}
      <div class="status-section">
        {#if bridgeStore.transferStatus === 'fetching_quote'}
          <div class="status preparing">Checking route...</div>
        {:else if bridgeStore.transferStatus === 'building_tx'}
          <div class="status preparing">Building transaction...</div>
        {:else if bridgeStore.transferStatus === 'signing'}
          <div class="status approving">Please sign in your wallet...</div>
        {:else if bridgeStore.transferStatus === 'sending'}
          <div class="status transferring">Sending...</div>
        {:else if bridgeStore.transferStatus === 'success'}
          <div class="status success">
            ✓ Transfer successful!
            {#if bridgeStore.txHashes.length > 0}
              <div class="tx-hashes">
                {#each bridgeStore.txHashes as hash}
                  <div class="tx-hash">
                    Tx: {hash.slice(0, 10)}...{hash.slice(-8)}
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      </div>
    {/if}

    {#if bridgeStore.transferError}
      <div class="text-red-500">
        Error: {bridgeStore.transferError}
      </div>
    {/if}

    <button
      type="submit"
      class="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
      disabled={bridgeStore.isLoading || !formData.sender}
    >
      {#if bridgeStore.isLoading}
        Processing...
      {:else}
        Transfer
      {/if}
    </button>
  </form>
{/if}

<style>
  .space-y-4 > * + * {
    margin-top: 1rem;
  }

  .loading {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 200px;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }

  input,
  select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 0.375rem;
  }

  button {
    cursor: pointer;
  }

  button:disabled {
    cursor: not-allowed;
  }

  .text-red-500 {
    color: #ef4444;
  }

  .bg-blue-500 {
    background-color: #3b82f6;
  }

  .text-white {
    color: white;
  }

  .px-4 {
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .py-2 {
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
  }

  .rounded {
    border-radius: 0.375rem;
  }

  .disabled\:opacity-50:disabled {
    opacity: 0.5;
  }

  /* Wallet Section */
  .wallet-section {
    padding: 1rem;
    background-color: #f9fafb;
    border-radius: 0.5rem;
    border: 1px solid #e5e7eb;
  }

  .connected {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .connected .label {
    font-weight: 500;
    color: #10b981;
  }

  .connected .address {
    font-family: monospace;
    color: #6b7280;
  }

  .connect-btn,
  .disconnect-btn {
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    font-weight: 500;
    border: none;
  }

  .connect-btn {
    background-color: #3b82f6;
    color: white;
    width: 100%;
  }

  .connect-btn:hover:not(:disabled) {
    background-color: #2563eb;
  }

  .disconnect-btn {
    background-color: #ef4444;
    color: white;
    font-size: 0.875rem;
    padding: 0.25rem 0.75rem;
    margin-left: auto;
  }

  .disconnect-btn:hover {
    background-color: #dc2626;
  }

  /* Balance Display */
  .balance-display {
    margin-top: 0.5rem;
    padding: 0.5rem;
    background-color: #f0f9ff;
    border-radius: 0.25rem;
    font-size: 0.875rem;
  }

  .balance-label {
    font-weight: 500;
    color: #6b7280;
    margin-right: 0.5rem;
  }

  .balance-value {
    font-family: monospace;
    color: #10b981;
    font-weight: 600;
  }

  .balance-loading {
    color: #6b7280;
    font-style: italic;
  }

  .balance-error {
    color: #ef4444;
    font-size: 0.75rem;
  }

  /* Status Section */
  .status-section {
    padding: 1rem;
    border-radius: 0.5rem;
    background-color: #f0f9ff;
    border: 1px solid #bae6fd;
  }

  .status {
    font-weight: 500;
  }

  .status.preparing {
    color: #0284c7;
  }

  .status.approving {
    color: #ea580c;
  }

  .status.transferring {
    color: #7c3aed;
  }

  .status.success {
    color: #10b981;
  }

  .tx-hashes {
    margin-top: 0.5rem;
    font-size: 0.875rem;
  }

  .tx-hash {
    font-family: monospace;
    color: #6b7280;
    padding: 0.25rem 0;
  }
</style>
