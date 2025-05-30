<script lang="ts">
  import type { LandWithActions } from '$lib/api/land';
  import OverallTab from './tabs/overall-tab.svelte';
  import BuyTab from './tabs/buy-tab.svelte';
  import HistoryTab from './tabs/history-tab.svelte';
  import Button from '$lib/components/ui/button/button.svelte';
  import type { TabType } from '$lib/interfaces';

  let { land }: { land: LandWithActions } = $props();

  let activeTab = $state<TabType>('overall');

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
    <Button
      class="w-full {activeTab === 'buy' ? '' : 'opacity-50'}"
      variant={activeTab === 'buy' ? 'blue' : undefined}
      onclick={() => setActiveTab('buy')}
    >
      BUY
    </Button>
    <Button
      disabled
      class="w-full {activeTab === 'history' ? '' : 'opacity-50'}"
      variant={activeTab === 'history' ? 'blue' : undefined}
      onclick={() => setActiveTab('history')}
    >
      HISTORY (todo)
    </Button>
  </div>

  <div class="w-full h-full mt-4">
    <OverallTab {land} bind:activeTab isActive={activeTab === 'overall'} />
    <BuyTab {land} bind:activeTab isActive={activeTab === 'buy'} />
    <HistoryTab {land} bind:activeTab isActive={activeTab === 'history'} />
  </div>
</div>
