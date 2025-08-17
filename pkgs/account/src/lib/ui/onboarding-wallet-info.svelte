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
  <div class="wallets-stack">
    {#if accountDataProvider.isConnected}
      <Card>
        <div class="account-details">
          <div class="wallet-label">Starknet</div>
          <p>{shortenHex(padAddress(accountDataProvider?.address ?? ''), 4)}</p>
          <button
            onclick={() => {
              accountManager?.disconnect();
            }}
            aria-label="Logout Starknet"
          >
            <img src="/ui/icons/logout.svg" alt="logout" class="logout-icon" />
          </button>
        </div>
      </Card>
    {:else}
      <Button class="connect-button" onclick={handleConnectWallet}>CONNECT</Button>
    {/if}
    
    {#if enablePhantom}
      {#if phantomWalletStore.isConnected}
        <Card>
          <div class="account-details">
            <div class="wallet-label phantom-label">Phantom</div>
            <p>{shortenAddress(phantomWalletStore.walletAddress, 4)}</p>
            <button
              onclick={() => phantomWalletStore.disconnect()}
              aria-label="Logout Phantom"
            >
              <img src="/ui/icons/logout.svg" alt="logout" class="logout-icon" />
            </button>
          </div>
        </Card>
      {:else}
        <Button class="connect-button phantom-button" onclick={handleConnectPhantom}>
          CONNECT WITH PHANTOM
        </Button>
      {/if}
    {/if}
  </div>
</div>

<style>
  .wallet-info-container {
    position: fixed;
    top: 0;
    right: 0;
    margin: 1.25rem;
  }

  .account-details {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 1rem;
  }

  .logout-icon {
    height: 1.25rem;
    width: 1.25rem;
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
