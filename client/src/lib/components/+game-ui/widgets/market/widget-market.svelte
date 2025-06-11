<script lang="ts">
  import * as Tabs from '$lib/components/ui/tabs';
  import { ScrollArea } from '$lib/components/ui/scroll-area';
  import WidgetAuctions from '../auctions/widget-auctions.svelte';
  import WidgetMyLands from '../my-lands/widget-my-lands.svelte';
</script>

<div class="h-full w-full flex flex-col">
  <Tabs.Root value="auctions" class="w-full h-full">
    <Tabs.List class="grid w-full grid-cols-2">
      <Tabs.Trigger value="auctions">Auctions</Tabs.Trigger>
      <Tabs.Trigger value="owned">Owned Lands</Tabs.Trigger>
    </Tabs.List>
    <Tabs.Content value="auctions" class="h-full">
      <WidgetAuctions />
    </Tabs.Content>
    <Tabs.Content value="owned" class="h-full">
      <WidgetMyLands />
    </Tabs.Content>
  </Tabs.Root>
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
