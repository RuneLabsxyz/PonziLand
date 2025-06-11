<script lang="ts">
  import Button from '$lib/components/ui/button/button.svelte';
  import WidgetAuctions from '../auctions/widget-auctions.svelte';
  import LandExplorer from './land-explorer.svelte';

  let activeTab = $state<'auctions' | 'owned'>('auctions');

  function setActiveTab(tab: 'auctions' | 'owned') {
    activeTab = tab;
  }
</script>

<div class="h-full w-full flex flex-col min-h-0">
  <div class="flex gap-2 w-full justify-center mt-2">
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
      LANDS
    </Button>
  </div>

  {#if activeTab === 'auctions'}
    <WidgetAuctions />
  {:else if activeTab === 'owned'}
    <LandExplorer />
  {/if}
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
