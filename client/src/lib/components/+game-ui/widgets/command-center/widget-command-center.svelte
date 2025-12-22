<script lang="ts">
  import { accountHistory } from '$lib/api/history/index.svelte';
  import { Separator } from '$lib/components/ui/separator';
  import { useDojo } from '$lib/contexts/dojo';
  import { padAddress } from '$lib/utils';
  import type { Snippet } from 'svelte';
  import { onDestroy, onMount } from 'svelte';
  import HistoryList from '../history/history-list.svelte';
  import MarketWidget from '../market/widget-market.svelte';
  import MyLandsWidget from '../my-lands/widget-my-lands.svelte';
  import HistoricalPositions from '../positions/historical-positions.svelte';
  import GameStatisticsWidget from './game-statistics/widget-game-statistics.svelte';
  import ActivityWidget from './activity/widget-activity.svelte';

  type Props = {
    setCustomTitle?: (title: Snippet<[]> | null) => void;
    setCustomControls?: (controls: Snippet<[]> | null) => void;
  };

  let { setCustomTitle, setCustomControls }: Props = $props();

  const dojo = useDojo();
  const account = () => {
    return dojo.accountManager?.getProvider();
  };

  let refreshInterval: NodeJS.Timeout;
  let activeTab = $state<
    | 'history'
    | 'positions'
    | 'market'
    | 'my-lands'
    | 'game-statistics'
    | 'activity'
  >('my-lands');

  function setActiveTab(
    tab:
      | 'history'
      | 'positions'
      | 'market'
      | 'my-lands'
      | 'game-statistics'
      | 'activity',
  ) {
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

  // Set custom title and controls if provided
  $effect(() => {
    if (setCustomTitle) {
      setCustomTitle(customTitleSnippet);
    }
  });
</script>

{#snippet customTitleSnippet()}
  <div class="flex items-center gap-1">
    <img
      src="/ui/icons/Icon_Building1_Thin.png"
      alt="Command Center"
      class="h-4 w-4"
    />
    <span class="font-ponzi-number text-xs capitalize mr-2">
      Command Center
    </span>
  </div>
{/snippet}

<div class="flex flex-col w-full h-full min-h-0">
  <div class="flex gap-1 my-2">
    <button
      class="flex items-center justify-center h-10 w-10"
      onclick={() => setActiveTab('my-lands')}
    >
      <img
        src="/ui/icons/Icon_Crown.png"
        alt="My Lands"
        class={[
          'h-8 w-8',
          {
            'drop-shadow-[0_0_2px_rgba(255,255,0,0.8)]':
              activeTab === 'my-lands',
          },
        ]}
      />
    </button>

    <button
      class="flex items-center justify-center h-10 w-10"
      onclick={() => setActiveTab('positions')}
    >
      <img
        src="/ui/icons/IconTiny_Bills.png"
        alt="Positions"
        class={[
          'h-8 w-8',
          {
            'drop-shadow-[0_0_2px_rgba(255,255,0,0.8)]':
              activeTab === 'positions',
          },
        ]}
      />
    </button>

    <button
      class="flex items-center justify-center h-10 w-10"
      onclick={() => setActiveTab('history')}
    >
      <img
        src="/ui/icons/Icon_Notification.png"
        alt="Notifications"
        class={[
          'h-8 w-8',
          {
            'drop-shadow-[0_0_2px_rgba(255,255,0,0.8)]':
              activeTab === 'history',
          },
        ]}
      />
    </button>

    <button
      class="flex items-center justify-center h-10 w-10"
      onclick={() => setActiveTab('game-statistics')}
    >
      <img
        src="/ui/icons/IconTiny_Stats.png"
        alt="Statistics"
        class={[
          'h-8 w-8',
          {
            'drop-shadow-[0_0_2px_rgba(255,255,0,0.8)]':
              activeTab === 'game-statistics',
          },
        ]}
      />
    </button>

    <button
      class="flex items-center justify-center h-10 w-10"
      onclick={() => setActiveTab('activity')}
    >
      <img
        src="/ui/icons/Icon_Thin_Book.png"
        alt="Activity"
        class={[
          'h-8 w-8',
          {
            'drop-shadow-[0_0_2px_rgba(255,255,0,0.8)]':
              activeTab === 'activity',
          },
        ]}
      />
    </button>
  </div>

  <div
    class="w-full flex justify-center items-center bg-black font-ponzi-number p-2 text-xs opacity-50 capitalize"
  >
    {activeTab.replace('-', ' ')}
  </div>

  <Separator class="my-2 opacity-50" />

  <div class="h-full w-full flex flex-col min-h-0">
    <!-- Tab Content -->
    {#if activeTab === 'history'}
      <HistoryList />
    {:else if activeTab === 'positions'}
      <HistoricalPositions {setCustomControls} />
    {:else if activeTab === 'my-lands'}
      <MyLandsWidget {setCustomControls} />
    {:else if activeTab === 'game-statistics'}
      <GameStatisticsWidget {setCustomControls} />
    {:else if activeTab === 'activity'}
      <ActivityWidget />
    {/if}
  </div>
</div>
