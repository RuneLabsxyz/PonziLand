<script lang="ts">
  import { on } from 'svelte/events';
  import { onMount } from 'svelte';
  import { dojoConfig } from '$lib/dojoConfig';
  import { setupAccount, USE_BURNER, useAccount } from '$lib/contexts/account';
  import Button from '../ui/button/button.svelte';
  import type { StarknetWindowObject } from '@starknet-io/get-starknet-core';

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
    validWallets = (await account.wait()).getAvailableWallets();
  })();

  onMount(() =>
    on(window, 'wallet_prompt', async () => {
      console.log('EVENT!');
      loading = true;
      visible = true;
      // Ensure everything has loaded.
      await promisesToWait;

      loading = false;
    }),
  );

  async function login(id: string) {
    await account.selectAndLogin(id);
    console.log('Logged in!');

    // TODO(#58): Split the session setup
    await account.setupSession();

    visible = false;
    // resolve waiting promises.
    window.dispatchEvent(new Event('wallet_login_success'));
  }
</script>

{#if visible}
  <div class="bg-black opacity-60 absolute w-screen h-screen top-0 left-0 z-40">
    &nbsp;
  </div>
  <div
    class="absolute top-absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white z-50 p-5 min-w-52 text-2xl"
  >
    {#if loading}
      Loading...
    {:else}
      WALLETS
      <div class="flex flex-col justify-stretch gap-2">
        {#each validWallets as wallet}
          {@const image =
            typeof wallet.icon == 'string' ? wallet.icon : wallet.icon.light}
          <Button
            class="flex flex-row justify-start"
            on:click={() => login(wallet.id)}
          >
            <img
              src={image}
              alt={wallet.name + ' logo'}
              class="h-10 p-2 pr-4"
            />
            <div>
              {wallet.name}
            </div>
          </Button>
        {/each}
      </div>
    {/if}
  </div>
{/if}
