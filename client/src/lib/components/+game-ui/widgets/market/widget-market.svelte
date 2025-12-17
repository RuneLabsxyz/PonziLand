<script lang="ts">
  import Button from '$lib/components/ui/button/button.svelte';
  import { useDojo } from '$lib/contexts/dojo';
  import WidgetAuctions from '../auctions/widget-auctions.svelte';
  import LandExplorer from './land-explorer.svelte';
  import TabNavigation from '$lib/components/ui/tab-navigation.svelte';
  import type { Snippet } from 'svelte';
  import account from '$lib/account.svelte';

  const { accountManager: dojoAccountManager } = useDojo();

  let {
    setCustomControls,
  }: {
    setCustomControls: (controls: Snippet<[]> | null) => void;
  } = $props();

  let activeTab = $state<'auctions' | 'owned'>('auctions');

  function setActiveTab(tab: 'auctions' | 'owned') {
    activeTab = tab;
  }

  const tabs = [
    { id: 'auctions', label: 'AUCTIONS' },
    { id: 'owned', label: 'LANDS' },
  ];

  let currentAccount = $derived(account);

  // Clear custom controls when switching away from auctions tab
  $effect(() => {
    if (activeTab !== 'auctions') {
      setCustomControls(null);
    }
  });
</script>

{#if !currentAccount.isConnected}
  <!-- Wallet connection prompt -->
  <div class="flex flex-col items-center justify-center gap-4 p-8">
    <div class="text-center tracking-wide">
      <p class="opacity-75 text-xl">
        To browse the market please connect your wallet.
      </p>
    </div>
    <Button
      class=""
      onclick={async () => {
        await dojoAccountManager?.promptForLogin();
      }}
    >
      CONNECT WALLET
    </Button>
  </div>
{:else}
  <div class="h-full w-full flex flex-col min-h-0">
    <div class="mt-2 w-full">
      <TabNavigation
        {tabs}
        {activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as 'auctions' | 'owned')}
      />
    </div>

    {#if activeTab === 'auctions'}
      <WidgetAuctions {setCustomControls} />
    {:else if activeTab === 'owned'}
      <LandExplorer />
    {/if}
  </div>
{/if}

<style>
  :global(.tabs-trigger[data-disabled]) {
    opacity: 0.5;
    cursor: not-allowed;
  }

  :global(.tabs-content[data-disabled]) {
    opacity: 0.5;
    pointer-events: none;
  }
</style>
