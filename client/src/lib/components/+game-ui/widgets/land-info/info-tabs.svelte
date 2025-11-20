<script lang="ts">
  import type { LandWithActions } from '$lib/api/land';
  import OverallTab from './tabs/overall-tab.svelte';
  import BuyTab from './tabs/buy-tab.svelte';
  import Button from '$lib/components/ui/button/button.svelte';
  import type { TabType } from '$lib/interfaces';
  import type { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { tutorialAttribute } from '$lib/components/tutorial/stores.svelte';
  import { onMount } from 'svelte';

  let {
    land,
    auctionPrice,
  }: { land: LandWithActions; auctionPrice?: CurrencyAmount } = $props();

  let activeTab = $state<TabType>('buy');

  onMount(() => {
    if (tutorialAttribute('wait_increase_stake').has) {
      activeTab = 'overall';
    }
  });

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
  </div>
</div>
