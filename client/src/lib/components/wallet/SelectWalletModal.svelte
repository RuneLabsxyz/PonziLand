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
  import { Card } from '../ui/card';
  import CloseButton from '../ui/close-button.svelte';
  import { ENABLE_RAMP } from '$lib/flags';
  import { Dice3 } from 'lucide-svelte';
  import { validators } from 'tailwind-merge';
  import { ChevronDown, ChevronUp } from 'lucide-svelte';

  let visible = $state(false);
  let loading = $state(true);
  let showAllWallets = $state(false);

  let validWallets: StarknetWindowObject[] = $state([]);

  function shuffleWallets() {
    validWallets = validWallets.sort(() => Math.random() - 0.5);
  }

  // If we are on dev mode, only add the burner button.
  // Otherise, check for all wallets, and setup controller.
  // We need to store the wallet in a context, like other extensions (this is where extensionWallet comes in handy)
  // And if a login is asked (with the event wallet_login), open the popup with the found wallets,
  // wait for a successful login, and possibly open a popup to ask for the session popup explaining how it works.

  const account = useAccount();

  const promisesToWait = (async () => {
    if (account != null) {
      validWallets = (await account.wait()).getAvailableWallets();
      console.log('validWallets', validWallets);
    }
  })();

  onMount(() => {
    on(window, 'wallet_prompt', async () => {
      console.log('EVENT!');
      loading = true;
      visible = true;

      // Ensure everything has loaded.
      await promisesToWait;

      loading = false;
    });
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

{#if visible}
  <div class="bg-black opacity-60 absolute w-screen h-screen top-0 left-0 z-40">
    &nbsp;
  </div>
  <Card
    class="absolute top-absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 p-10 text-2xl min-w-80"
  >
    <CloseButton
      onclick={() => {
        visible = false;
      }}
    />
    {#if loading}
      Loading...
    {:else}
      <div class="m-3 mt-0">
        <div class="mb-5 flex gap-2">
          <div>WALLETS</div>
        </div>

        <div class="flex flex-col justify-stretch gap-2">
          {#if validWallets.length >= 2}
            {#if !showAllWallets}
              {@const controllerWallet = validWallets.find(
                (wallet) => wallet.id === 'controller',
              )}
              {#if controllerWallet}
                {@const image =
                  typeof controllerWallet.icon == 'string'
                    ? controllerWallet.icon
                    : controllerWallet.icon.light}
                <Button
                  class="flex flex-row justify-start w-full min-h-[60px] p-3"
                  on:click={() => login(controllerWallet.id)}
                >
                  <img
                    src={image}
                    alt={controllerWallet.name + ' logo'}
                    class="h-10 p-2 pr-4"
                  />
                  <div class="flex flex-col items-start text-left">
                    <div class="text-lg">
                      {controllerWallet.name}
                    </div>
                    <div class="text-sm opacity-70 text-green-500">
                      FREE GAS!
                    </div>
                  </div>
                </Button>
                <Button
                  class="text-sm flex items-center justify-center mt-2 text-sm opacity-50"
                  variant="red"
                  on:click={() => (showAllWallets = true)}
                >
                  <ChevronDown class="h-4 w-4 mr-1" />
                  <span>Want to use a different wallet?</span>
                </Button>
              {/if}
            {:else}
              {#each validWallets as wallet}
                {@const image =
                  typeof wallet.icon == 'string'
                    ? wallet.icon
                    : wallet.icon.light}
                <Button
                  class="flex flex-row justify-start w-full min-h-[60px] p-3"
                  on:click={() => login(wallet.id)}
                >
                  <img
                    src={image}
                    alt={wallet.name + ' logo'}
                    class="h-10 p-2 pr-4"
                  />
                  <div class="flex flex-col items-start text-left">
                    <div class="text-lg">
                      {wallet.name}
                    </div>
                    {#if wallet.id == 'controller'}
                      <div class="text-sm opacity-70 text-green-500">
                        FREE GAS!
                      </div>
                    {:else}
                      <div class="text-sm opacity-70 text-red-600">
                        Standard
                      </div>
                    {/if}
                  </div>
                </Button>
              {/each}
              <Button
                class="text-sm flex items-center justify-center mt-2"
                on:click={() => (showAllWallets = false)}
              >
                <ChevronUp class="h-4 w-4 mr-1" />
                <span>Show fewer options</span>
              </Button>
            {/if}
          {:else}
            {#each validWallets as wallet}
              {@const image =
                typeof wallet.icon == 'string'
                  ? wallet.icon
                  : wallet.icon.light}
              <Button
                class="flex flex-row justify-start w-full min-h-[60px] p-3"
                on:click={() => login(wallet.id)}
              >
                <img
                  src={image}
                  alt={wallet.name + ' logo'}
                  class="h-10 p-2 pr-4"
                />
                <div class="flex flex-col items-start text-left">
                  <div class="text-lg">Login</div>
                </div>
              </Button>
            {/each}
          {/if}
          {#if ENABLE_RAMP}
            _________________________
            <Button
              class="flex flex-row justify-start"
              on:click={() => {
                visible = false;
                goto('/ramp');
              }}>Phantom</Button
            >
          {/if}
        </div>
      </div>
    {/if}
  </Card>
{/if}
