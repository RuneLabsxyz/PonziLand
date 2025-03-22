<script lang="ts">
  import Card from '../ui/card/card.svelte';

  import accountDataProvider, { refresh, setup } from '$lib/account.svelte';
  import { Button } from '../ui/button';
  import { useAccount } from '$lib/contexts/account.svelte';
  import { padAddress, shortenHex } from '$lib/utils';

  const {
    onconnect,
  }: {
    onconnect?: () => void;
  } = $props();

  const accountManager = useAccount();
  // Ensure that setup is done.
  setup();

  $inspect('Profile: ', accountDataProvider.profile);

  async function handleConnectWallet() {
    await accountManager?.promptForLogin();

    onconnect?.();
  }
</script>

<div class="fixed top-0 right-0 m-5">
  {#if accountDataProvider.isConnected}
    <Card>
      <div class="flex flex-row items-center gap-4">
        {#if accountDataProvider.profile?.exists}
          <p>
            <span class="opacity-50">Connected as</span>
            {accountDataProvider.profile?.username}
          </p>
        {:else}
          <p>{shortenHex(padAddress(accountDataProvider?.address ?? ''), 4)}</p>
        {/if}
        <img
          src={accountManager?.getProvider()?.icon}
          alt="Wallet Icon"
          class="w-6 h-6"
        />

        <div class="">
          <button
            onclick={() => {
              useAccount()?.disconnect();
            }}
            aria-label="Logout"
          >
            <img
              src="/ui/icons/logout.png"
              alt="logout"
              class="h-5 w-5"
            />
          </button>
        </div>
      </div>
    </Card>
  {:else}
    <Button class="m-2" onclick={handleConnectWallet}>CONNECT WALLET</Button>
  {/if}
</div>
