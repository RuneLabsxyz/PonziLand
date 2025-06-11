<script lang="ts">
  import { ScrollArea } from '$lib/components/ui/scroll-area';
  import WidgetAuctions from '../auctions/widget-auctions.svelte';
  import WidgetMyLands from '../my-lands/widget-my-lands.svelte';
  import Button from '$lib/components/ui/button/button.svelte';

  let activeTab = $state<'auctions' | 'owned'>('auctions');

  function setActiveTab(tab: 'auctions' | 'owned') {
    activeTab = tab;
  }
</script>

<div class="h-full w-full flex flex-col">
  <div class="flex gap-2 w-full justify-center mt-6 mr-6">
    <Button
      class="w-full {activeTab === 'auctions' ? '' : 'opacity-50'}"
      variant={activeTab === 'auctions' ? 'blue' : undefined}
      onclick={() => setActiveTab('auctions')}
    >
      AUCTIONS
    </Button>
    <Button
      class="w-full {activeTab === 'owned' ? '' : 'opacity-50'}"
      variant={activeTab === 'owned' ? 'blue' : undefined}
      onclick={() => setActiveTab('owned')}
    >
      OWNED LANDS
    </Button>
  </div>

  <div class="w-full h-full mt-4">
    {#if activeTab === 'auctions'}
      <WidgetAuctions />
    {:else if activeTab === 'owned'}
      <WidgetMyLands />
    {/if}
  </div>
</div>

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
