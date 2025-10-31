<script lang="ts">
  import Button from '$lib/components/ui/button/button.svelte';
  import HistoryList from '../history/history-list.svelte';
  import HistoricalPositions from './historical-positions.svelte';
  import { accountHistory } from '$lib/api/history/index.svelte';
  import { useDojo } from '$lib/contexts/dojo';
  import { padAddress } from '$lib/utils';
  import { onMount, onDestroy } from 'svelte';
  import type { Snippet } from 'svelte';

  const dojo = useDojo();
  const account = () => {
    return dojo.accountManager?.getProvider();
  };

  let refreshInterval: NodeJS.Timeout;
  let activeTab = $state<'history' | 'positions'>('history');

  function setActiveTab(tab: 'history' | 'positions') {
    activeTab = tab;
  }

  onMount(async () => {
    try {
      const currentAccount = account()?.getWalletAccount();
      if (!currentAccount) {
        console.error('No wallet account available');
        return;
      }

      const userAddress = padAddress(currentAccount.address)!;
      accountHistory.setAccount(userAddress);

      // Set up auto-refresh every 30 seconds for history tab
      refreshInterval = setInterval(() => {
        if (activeTab === 'history') {
          accountHistory.fetchNewEvents();
        }
      }, 30000);
    } catch (error) {
      console.error('Error setting up command center widget:', error);
    }
  });

  onDestroy(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
  });
</script>

<div class="command-center-widget h-full w-full flex flex-col">
  <!-- Tab Navigation -->
  <div class="flex gap-2 w-full justify-center mt-2 px-4">
    <Button
      class="w-full {activeTab === 'history' ? '' : 'opacity-50'}"
      variant={activeTab === 'history' ? 'blue' : undefined}
      onclick={() => setActiveTab('history')}
    >
      HISTORY
    </Button>
    <Button
      class="w-full {activeTab === 'positions' ? '' : 'opacity-50'}"
      variant={activeTab === 'positions' ? 'blue' : undefined}
      onclick={() => setActiveTab('positions')}
    >
      POSITIONS
    </Button>
  </div>

  <!-- Tab Content -->
  <div class="flex-1 mt-4 min-h-0">
    {#if activeTab === 'history'}
      <HistoryList />
    {:else if activeTab === 'positions'}
      <HistoricalPositions />
    {/if}
  </div>
</div>
