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

<div class="fixed top-0 right-0 m-5">
  {#if accountDataProvider.isConnected}
    <Card>
      <div class="flex flex-row items-center gap-4">
        <p>{shortenHex(padAddress(accountDataProvider?.address ?? ''), 4)}</p>


        <div class="">
          <button
            onclick={() => {
              useAccount()?.disconnect();
            }}
            aria-label="Logout"
          >
            <img src="/ui/icons/logout.svg" alt="logout" class="h-5 w-5" />
          </button>
        </div>
      </div>
    </Card>
  {:else}
    <Button class="m-2" onclick={handleConnectWallet}>CONNECT WALLET</Button>
  {/if}
</div>
