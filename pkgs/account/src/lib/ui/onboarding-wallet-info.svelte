<script lang="ts">
  import { Button, Card } from '@ponziland/ui';

  import accountDataProvider, { setup } from '../account.svelte.js';
  import { useAccount } from '../context/account.svelte.js';
  import { padAddress, shortenHex, shortenAddress } from '../utils.js';
  import { onMount } from 'svelte';
  import { phantomWalletStore } from '../wallets/phantom.svelte.js';

  const {
    onconnect,
    enablePhantom = false,
  }: {
    onconnect?: () => void;
    enablePhantom?: boolean;
  } = $props();

  let accountManager = $state<ReturnType<typeof useAccount>>();

  onMount(async () => {
    accountManager = useAccount();
    setup();
    if (enablePhantom) {
      await phantomWalletStore.initialize();
    }
  });


  async function handleConnectWallet() {
    await accountManager?.promptForLogin();

    onconnect?.();
  }

  async function handleConnectPhantom() {
    const success = await phantomWalletStore.connect();
    if (success) {
      onconnect?.();
    }
  }
</script>

<div class="wallet-info-container">
  <Card>
  <div class="wallet-header">
    <span class="connected">Connected</span>
    <span class="status-dot" aria-hidden="true"></span>
  </div>
  <div class="wallets-stack">
    {#if accountDataProvider.isConnected}
      <div class="account-details">
        <div class="wallet-label">Starknet</div>
        <p>{shortenHex(padAddress(accountDataProvider?.address ?? ''), 4)}</p>
        <Button
          onclick={() => accountManager?.disconnect()}
          aria-label="Logout Starknet"
        >
          x
        </Button>
      </div>
    {:else}
      <Button class="connect-button phantom-button" onclick={handleConnectWallet}>CONNECT</Button>
    {/if}
    
    {#if enablePhantom}
      {#if phantomWalletStore.isConnected}
          <div class="account-details">
            <div class="wallet-label phantom-label">Phantom</div>
            <p>{shortenAddress(phantomWalletStore.walletAddress, 4)}</p>
            <Button
              onclick={() => phantomWalletStore.disconnect()}
              aria-label="Logout Phantom"
            >
            x
            </Button>
          </div>
      {:else}
        <Button class="connect-button phantom-button" onclick={handleConnectPhantom}>
          CONNECT WITH PHANTOM
        </Button>
      {/if}
    {/if}
  </div>
</Card>
</div>

<style>
  .wallet-info-container {
    position: fixed;
    top: 0;
    right: 0;
    margin: 1.25rem;
  }

  .wallet-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.25rem 0.75rem;
    border-bottom: 2px solid #fff;
  }

  .connected {
    font-family: 'PonziNumber', sans-serif;
  }

  .status-dot {
    width: 0.5rem;
    height: 0.5rem;
    background: #10b981;
    border-radius: 9999px;
    flex: 0 0 auto;
  }

  .account-details {
    font-family: 'PonziDS', sans-serif;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    border-radius: 0.25rem;
    border: 1px solid #888;

    padding: 0.25rem 0.75rem;
    margin-top: 0.5rem;

  }

  .account-details p {
    margin: 0;
  }

  .wallets-stack {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .wallet-label {
    font-size: 0.75rem;
    font-weight: bold;
    text-transform: uppercase;
    opacity: 0.7;
  }

  .phantom-label {
    color: #ab9ff2;
  }
</style>
