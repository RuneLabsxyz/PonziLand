<script lang="ts">
  import { useAccount } from '$lib/contexts/account.svelte';
  import type { AuthOptions } from '@cartridge/controller';
  import type { StarknetWindowObject } from '@starknet-io/get-starknet-core';
  import { onMount } from 'svelte';
  import { on } from 'svelte/events';
  import Button from '$lib/components/ui/button/button.svelte';
  import { Card } from '$lib/components/ui/card';
  import CloseButton from '$lib/components/ui/close-button.svelte';
  import { referralStore } from '$lib/stores/referral.store.svelte';

  let visible = $state(false);
  let loading = $state(true);
  let showAllWallets = $state(true);
  let phantomDetected = $state(false);

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
      console.log('validWallets', validWallets);
    }
    // Check if Phantom wallet extension is available
    phantomDetected =
      typeof window !== 'undefined' && !!window.phantom?.ethereum;
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

  async function login(id: string, signupOptions?: AuthOptions) {
    await account!.selectAndLogin(id, signupOptions);
    console.log('Logged in!');

    // TODO(#58): Split the session setup
    if (account!.getProvider()?.supportsSession()) {
      await account!.setupSession();
    }

    // Check for pending referral and submit if exists
    console.log('[Referral] Checking pending code:', referralStore.pendingCode);
    if (referralStore.pendingCode) {
      try {
        const walletAccount = account!.getProvider()?.getWalletAccount();
        const address = walletAccount?.address;
        console.log(
          '[Referral] Wallet account:',
          walletAccount ? 'exists' : 'null',
          'address:',
          address,
        );
        if (walletAccount && address) {
          console.log('[Referral] Submitting referral...');
          const result = await referralStore.submitReferral(
            address,
            walletAccount,
          );
          if (result.success) {
            console.log('[Referral] Submitted successfully');
          } else {
            console.log('[Referral] Submission skipped:', result.error);
          }
        } else {
          console.log('[Referral] No wallet account available');
        }
      } catch (e) {
        console.error('[Referral] Submission failed:', e);
        // Don't block login on referral failure
      }
    } else {
      console.log('[Referral] No pending code');
    }

    visible = false;
    // resolve waiting promises.
    window.dispatchEvent(new Event('wallet_login_success'));
  }
</script>

{#if visible}
  <div
    class="bg-black opacity-60 absolute w-screen h-screen top-0 left-0 z-[99]"
  >
    &nbsp;
  </div>
  <Card
    class="absolute bg-ponzi top-absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[100] p-10 text-2xl min-w-80"
  >
    <CloseButton
      onclick={() => {
        visible = false;
      }}
    />
    {#if loading}
      Loading...
    {:else}
      <div class="m-1 mt-0">
        <div class="mb-5 flex gap-2">
          <div class="font-ponzi-number text-sm mt-1">Wallets</div>
        </div>

        <div class="flex flex-col justify-stretch gap-2">
          {#each validWallets as wallet}
            {@const image =
              typeof wallet.icon == 'string' ? wallet.icon : wallet.icon.light}
            <Button
              class="flex flex-row justify-start w-full min-h-[60px] p-3 pb-5"
              onclick={() => login(wallet.id)}
            >
              <img
                src={image}
                alt={wallet.name + ' logo'}
                class="h-10 p-2 pr-4"
              />
              <div class="flex flex-col items-start text-left">
                <div class="text-lg">{wallet.name}</div>
              </div>
            </Button>
          {/each}
          {#if phantomDetected}
            <div class="border-t border-gray-600 my-2"></div>
            <Button
              class="flex flex-row justify-start w-full min-h-[60px] p-3 pb-5"
              onclick={() => login('controller', ['phantom-evm'])}
            >
              <img
                src="/extra/wallets/phantom.png"
                alt="Phantom logo"
                class="h-10 p-2 pr-4"
              />
              <div class="flex flex-col items-start text-left">
                <div class="text-lg">Phantom</div>
              </div>
            </Button>
          {/if}
        </div>
      </div>
    {/if}
  </Card>
{/if}
