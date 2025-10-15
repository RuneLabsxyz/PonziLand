<script lang="ts">
  import accountDataProvider, { setup } from '$lib/account.svelte';
  import { getSocialink } from '$lib/accounts/social/index.svelte';
  import { Button } from '$lib/components/ui/button';
  import { useDojo } from '$lib/contexts/dojo';
  import { ENABLE_TOKEN_DROP } from '$lib/flags';
  import { widgetsStore } from '$lib/stores/widgets.store';
  import { padAddress, shortenHex } from '$lib/utils';
  import type { Snippet } from 'svelte';
  import WalletBalance from './wallet-balance.svelte';

  let {
    setCustomControls,
  }: {
    setCustomControls: (controls: Snippet<[]> | null) => void;
  } = $props();

  setup();

  let copied = $state(false);

  function copy() {
    try {
      navigator.clipboard.writeText(padAddress(address ?? '')!);

      copied = true;
      setTimeout(() => {
        copied = false;
      }, 1000);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  }

  function openNftLink() {
    widgetsStore.addWidget({
      id: 'nft-link',
      type: 'nft-link',
      position: { x: 100, y: 100 },
      dimensions: { width: 500, height: 500 },
      isMinimized: false,
      isOpen: true,
      data: {},
    });
  }

  function openSwapWidget() {
    widgetsStore.updateWidget('swap', { isOpen: true });
  }

  let socialink = getSocialink();
  const { accountManager } = useDojo();
  let address = $derived(accountDataProvider.address);
  let username = $derived(socialink?.getUser(address ?? ''));
  let connected = $derived(accountDataProvider.isConnected);
  let providerIcon = $derived(accountDataProvider.providerIcon);
  let providerName = $derived(accountDataProvider.providerName);

  function handleProviderIconClick() {
    if (accountManager?.getProvider()) {
      const controller = accountManager.getProvider() as any;
      if (controller.openProfile) {
        controller.openProfile();
      }
    }
  }
</script>

{#if connected}
  <div class="flex justify-between items-center mt-2">
    <div class="flex gap-2 items-center">
      {#if providerIcon}
        <button
          type="button"
          class="{providerName === 'controller'
            ? 'hover:cursor-pointer hover:opacity-50'
            : ''} h-4 w-4 rounded flex items-center justify-center"
          onclick={providerName === 'controller'
            ? handleProviderIconClick
            : undefined}
        >
          <img
            src={providerIcon}
            alt="Wallet provider"
            class="h-4 w-4 rounded"
          />
        </button>
      {/if}
      <button type="button" onclick={copy} class="text-left relative">
        {#await username then info}
          {#if info?.exists}
            <p class="font-ponzi-number">
              {info.username ?? ''}
              <span class="opacity-50">
                {shortenHex(padAddress(address ?? ''), 4)}
              </span>
            </p>
          {:else}
            <p>
              {shortenHex(padAddress(address ?? ''), 4)}
            </p>
          {/if}
        {/await}
        {#if copied}
          <div class="absolute right-0 translate-x-full pl-2 top-0">
            Copied!
          </div>
        {/if}
      </button>
    </div>
    <button
      onclick={() => {
        accountManager?.disconnect();
      }}
      aria-label="Logout"
    >
      <img src="/ui/icons/logout.png" alt="logout" class="h-5 w-5" />
    </button>
  </div>
  {#if ENABLE_TOKEN_DROP}
    <div class="flex">
      <Button size="md" class="w-full mt-2" onclick={openNftLink}>
        Claim token drop
      </Button>
    </div>
  {/if}

  <div class="flex flex-col">
    <WalletBalance {setCustomControls} />
    <Button size="md" class="w-full" onclick={openSwapWidget}>SWAP</Button>
  </div>
{:else}
  <Button
    class="m-2"
    onclick={async () => {
      await accountManager?.promptForLogin();
    }}
  >
    CONNECT WALLET
  </Button>
{/if}
