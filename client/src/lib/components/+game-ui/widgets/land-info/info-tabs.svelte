<script lang="ts">
  import type { LandWithActions } from '$lib/api/land';
  import OverallTab from './tabs/overall-tab.svelte';
  import BuyTab from './tabs/buy-tab.svelte';
  import HistoryTab from './tabs/history-tab.svelte';
  import QuestsTab from './tabs/quest-tab.svelte';
  import Button from '$lib/components/ui/button/button.svelte';
  import type { TabType } from '$lib/interfaces';
  import { tutorialState } from '$lib/components/tutorial/stores.svelte';
  import type { CurrencyAmount } from '$lib/utils/CurrencyAmount';

  let {
    land,
    auctionPrice,
  }: { land: LandWithActions; auctionPrice?: CurrencyAmount } = $props();

  let activeTab = $state<TabType>('buy');

  const showDevTools = window.location.hash === '#dev';

  function setActiveTab(tab: TabType) {
    activeTab = tab;
  }
</script>

<div class="w-full h-full flex flex-col mt-6 mr-6">
  <div class="flex gap-2 w-full justify-center">
    <Button
      class="w-full {activeTab === 'overall' ? '' : 'opacity-50'}"
      variant={activeTab === 'overall' ? 'blue' : undefined}
      onclick={() => setActiveTab('overall')}
    >
      OVERALL
    </Button>
    {#if tutorialState.tutorialProgress == 6}
      <div class="w-full border border-yellow-500 animate-pulse">
        <Button
          class="w-full {activeTab === 'buy' ? '' : 'opacity-50'}"
          variant={activeTab === 'buy' ? 'blue' : undefined}
          onclick={() => setActiveTab('buy')}
        >
          BUY
        </Button>
      </div>
    {:else}
      <Button
        class="w-full {activeTab === 'buy' ? '' : 'opacity-50'}"
        variant={activeTab === 'buy' ? 'blue' : undefined}
        onclick={() => setActiveTab('buy')}
      >
        BUY
      </Button>
    {/if}
    <Button
      disabled
      class="w-full {activeTab === 'history' ? '' : 'opacity-50'}"
      variant={activeTab === 'history' ? 'blue' : undefined}
      onclick={() => setActiveTab('history')}
    >
      HISTORY (todo)
    </Button>
    <Button
      class="w-full {activeTab === 'quests' ? '' : 'opacity-50'}"
      variant={activeTab === 'quests' ? 'blue' : undefined}
      onclick={() => setActiveTab('quests')}
    >
      Quests
    </Button>
  </div>

  <div class="w-full h-full mt-4">
    <OverallTab
      {land}
      bind:activeTab
      isActive={activeTab === 'overall'}
      {auctionPrice}
    />
    <BuyTab
      {land}
      bind:activeTab
      isActive={activeTab === 'buy'}
      {auctionPrice}
    />
    <HistoryTab {land} bind:activeTab isActive={activeTab === 'history'} />
    {#if showDevTools}
    <QuestsTab {land} bind:activeTab isActive={activeTab === 'quests'} />
    {/if}
  </div>
</div>
