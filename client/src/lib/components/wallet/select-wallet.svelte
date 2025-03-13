<script lang="ts">
  import { on } from 'svelte/events';
  import { onMount } from 'svelte';
  import { dojoConfig } from '$lib/dojoConfig';
  import {
    AccountManager,
    setupAccount,
    USE_BURNER,
    useAccount,
  } from '$lib/contexts/account.svelte';
  import Button from '../ui/button/button.svelte';
  import type { StarknetWindowObject } from '@starknet-io/get-starknet-core';
  import { goto } from '$app/navigation';

  let visible = $state(false);
  let loading = $state(true);

  let validWallets: StarknetWindowObject[] = $state([]);

  // If we are on dev mode, only add the burner button.
  // Otherise, check for all wallets, and setup controller.
  // We need to store the wallet in a context, like other extensions (this is where extensionWallet comes in handy)
  // And if a login is asked (with the event wallet_login), open the popup with the found wallets,
  // wait for a successful login, and possibly open a popup to ask for the session popup explaining how it works.

  const account = useAccount();

  const promisesToWait = (async () => {
    if (account != null) {
      validWallets = (await account.wait()).getAvailableWallets();
    }
  })();

  onMount(async () => {
    loading = true;
    // Ensure everything has loaded.
    await promisesToWait;

    loading = false;
  });

  async function login(id: string) {
    await account!.selectAndLogin(id);
    console.log('Logged in!');

    // TODO(#58): Split the session setup
    if (account!.getProvider()?.supportsSession()) {
      await account!.setupSession();
    }

    visible = false;
    // resolve waiting promises.
    window.dispatchEvent(new Event('wallet_login_success'));
  }
</script>

{#if loading}
  Loading...
{:else}
  <div class="flex flex-col justify-stretch gap-2 w-full">
    {#each validWallets as wallet}
      {@const image =
        typeof wallet.icon == 'string' ? wallet.icon : wallet.icon.light}
      <Button
        class="flex flex-row justify-start"
        on:click={() => login(wallet.id)}
      >
        <img src={image} alt={wallet.name + ' logo'} class="h-10 p-2 pr-4" />
        <div>
          {wallet.name}
        </div>
      </Button>
    {/each}
  </div>
{/if}
