<script lang="ts">
  import type { LandWithActions } from '$lib/api/land';
  import OverallTab from './tabs/overall-tab.svelte';
  import BuyTab from './tabs/buy-tab.svelte';
  import TabNavigation from '$lib/components/ui/tab-navigation.svelte';
  import type { TabType } from '$lib/interfaces';
  import type { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { tutorialAttribute } from '$lib/components/tutorial/stores.svelte';
  import { onMount } from 'svelte';

  interface Props {
    land: LandWithActions;
    auctionPrice?: CurrencyAmount;
    showSwapButton?: boolean;
    onSwapClick?: (() => void) | null;
    swapTokenSymbol?: string | null;
  }

  let {
    land,
    auctionPrice,
    showSwapButton = $bindable(false),
    onSwapClick = $bindable(null),
    swapTokenSymbol = $bindable(null),
  }: Props = $props();

  let activeTab = $state<TabType>('buy');

  onMount(() => {
    if (tutorialAttribute('wait_increase_stake').has) {
      activeTab = 'overall';
    }
  });

  function setActiveTab(tab: TabType) {
    activeTab = tab;
  }

  const tabs = [
    { id: 'overall', label: 'OVERALL' },
    { id: 'buy', label: 'BUY' },
  ];
</script>

<div class="w-full h-full flex flex-col mt-6 mr-6">
  <div class="flex gap-2 w-full justify-center">
    <TabNavigation
      {tabs}
      {activeTab}
      onTabChange={(tabId) => setActiveTab(tabId as TabType)}
      borderBottom={false}
    />
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
      bind:showSwapButton
      bind:onSwapClick
      bind:swapTokenSymbol
    />
  </div>
</div>
