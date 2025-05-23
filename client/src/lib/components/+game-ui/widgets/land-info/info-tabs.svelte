<script lang="ts">
  import type { LandWithActions } from '$lib/api/land';
  import OverallTab from './tabs/overall-tab.svelte';
  import DailyTab from './tabs/daily-tab.svelte';
  import HistoryTab from './tabs/history-tab.svelte';
  import Button from '$lib/components/ui/button/button.svelte';

  let { land }: { land: LandWithActions } = $props();

  type TabType = 'overall' | 'daily' | 'history';
  let activeTab = $state<TabType>('overall');

  function setActiveTab(tab: TabType) {
    activeTab = tab;
  }
</script>

<div class="w-full h-full flex flex-col mt-6">
  <div class="flex gap-2 w-full justify-center">
    <Button
      class="w-full {activeTab === 'overall' ? '' : 'opacity-50'}"
      variant={activeTab === 'overall' ? 'blue' : undefined}
      on:click={() => setActiveTab('overall')}
    >
      OVERALL
    </Button>
    <Button
      class="w-full {activeTab === 'daily' ? '' : 'opacity-50'}"
      variant={activeTab === 'daily' ? 'blue' : undefined}
      on:click={() => setActiveTab('daily')}
    >
      DAILY
    </Button>
    <Button
      class="w-full {activeTab === 'history' ? '' : 'opacity-50'}"
      variant={activeTab === 'history' ? 'blue' : undefined}
      on:click={() => setActiveTab('history')}
    >
      HISTORY
    </Button>
  </div>

  <div class="w-full h-full mt-4">
    <OverallTab {land} isActive={activeTab === 'overall'} />
    <DailyTab isActive={activeTab === 'daily'} />
    <HistoryTab isActive={activeTab === 'history'} />
  </div>
</div>
