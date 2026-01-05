<script lang="ts">
  import {
    useSolanaAccount,
    setupSolanaAccount,
  } from '$lib/bridge/solana-account.svelte';
  import type { Adapter, WalletName } from '@solana/wallet-adapter-base';
  import { onMount } from 'svelte';
  import { on } from 'svelte/events';
  import Button from '$lib/components/ui/button/button.svelte';
  import { Card } from '$lib/components/ui/card';
  import CloseButton from '$lib/components/ui/close-button.svelte';

  let visible = $state(false);
  let loading = $state(true);
  let showAllWallets = $state(false);

  let validWallets: Adapter[] = $state([]);

  // Filter to show only installed wallets by default
  let installedWallets = $derived(
    validWallets.filter(
      (w) => w.readyState === 'Installed' || w.readyState === 'Loadable',
    ),
  );
  let notInstalledWallets = $derived(
    validWallets.filter((w) => w.readyState === 'NotDetected'),
  );
  let displayedWallets = $derived(
    showAllWallets
      ? [...installedWallets, ...notInstalledWallets]
      : installedWallets,
  );

  // Get solana account lazily to avoid race conditions
  function getSolanaAccount() {
    return useSolanaAccount();
  }

  async function loadWallets() {
    // Try to get existing account or set it up
    let account = getSolanaAccount();
    if (!account) {
      account = await setupSolanaAccount();
    }
    if (account) {
      // Add timeout to prevent indefinite loading
      const timeoutPromise = new Promise<void>((resolve) =>
        setTimeout(resolve, 10000),
      );
      await Promise.race([account.wait(), timeoutPromise]);
      validWallets = account.getAvailableWallets();
    }
  }

  onMount(() => {
    on(window, 'solana_wallet_prompt', async () => {
      console.log('[Solana] Wallet prompt event received');
      loading = true;
      visible = true;

      await loadWallets();

      loading = false;
    });
  });

  async function login(walletName: string) {
    const solanaAccount = getSolanaAccount();
    try {
      await solanaAccount!.selectAndConnect(walletName as WalletName);
      console.log('[Solana] Logged in with:', walletName);

      visible = false;
      window.dispatchEvent(new Event('solana_wallet_login_success'));
    } catch (error) {
      console.error('[Solana] Login failed:', error);
    }
  }

  function getReadyStateLabel(
    readyState: string,
  ): { text: string; color: string } | null {
    switch (readyState) {
      case 'Installed':
        return { text: 'Installed', color: 'text-green-400' };
      case 'NotDetected':
        return { text: 'Not installed', color: 'text-gray-400' };
      case 'Loadable':
        return { text: 'Available', color: 'text-blue-400' };
      default:
        return null;
    }
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
          <div class="font-ponzi-number text-sm mt-1">Solana Wallets</div>
        </div>

        <div class="flex flex-col justify-stretch gap-2">
          {#each displayedWallets as wallet}
            {@const readyState = getReadyStateLabel(wallet.readyState)}
            <button
              type="button"
              class="flex items-center w-full pt-1 pb-2 px-4 gap-3 rounded-md button-ponzi-blue stroke-3d-blue"
              onclick={() => login(wallet.name)}
            >
              <img
                src={wallet.icon}
                alt={wallet.name + ' logo'}
                class="w-8 h-8 shrink-0"
              />
              <div class="flex flex-col items-start text-left">
                <div class="text-sm text-white font-ponzi-number">
                  {wallet.name}
                </div>
                {#if readyState}
                  <div class="text-xs {readyState.color}">
                    {readyState.text}
                  </div>
                {/if}
              </div>
            </button>
          {/each}

          {#if notInstalledWallets.length > 0}
            <Button
              variant="red"
              onclick={() => (showAllWallets = !showAllWallets)}
            >
              <div class="text-xs">
                {showAllWallets ? 'Show less' : 'See more wallets'}
              </div>
            </Button>
          {/if}
        </div>
      </div>
    {/if}
  </Card>
{/if}
