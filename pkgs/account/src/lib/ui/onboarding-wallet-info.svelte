<script lang="ts">
  import { Button, Card } from '@ponziland/ui';

  import accountDataProvider, { setup } from '../account.svelte.js';
  import { useAccount } from '../context/account.svelte.js';
  import { padAddress, shortenHex } from '../utils.js';
  import { onMount } from 'svelte';

  const {
    onconnect,
  }: {
    onconnect?: () => void;
  } = $props();

  let accountManager = $state<ReturnType<typeof useAccount>>();

  onMount(() => {
    accountManager = useAccount();
    setup();
  });


  async function handleConnectWallet() {
    await accountManager?.promptForLogin();

    onconnect?.();
  }
</script>

<div class="wallet-info-container">
  {#if accountDataProvider.isConnected}
    <Card>
      <div class="account-details">
        <p>{shortenHex(padAddress(accountDataProvider?.address ?? ''), 4)}</p>


        <div class="">
          <button
            onclick={() => {
              useAccount()?.disconnect();
            }}
            aria-label="Logout"
          >
            <img src="/ui/icons/logout.svg" alt="logout" class="logout-icon" />
          </button>
        </div>
      </div>
    </Card>
  {:else}
    <Button class="connect-button" onclick={handleConnectWallet}>CONNECT WALLET</Button>
  {/if}
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

  .connect-button {
    margin: 0.5rem;
  }
</style>
