<script lang="ts">
  import { uiStore } from '$lib/stores/ui.store.svelte';
  import ToolbarButton from './toolbar-button.svelte';
  import ToolbarDrawer from './toolbar-drawer.svelte';
</script>

<div class="fixed bottom-0 left-0 flex gap-2 z-20 p-2">
  <ToolbarButton
    active={'lands' === uiStore.toolbarActive}
    onclick={() => {
      if (uiStore.toolbarActive === 'lands') {
        uiStore.toolbarActive = null;
      } else {
        uiStore.toolbarActive = 'lands';
      }
    }}
  >
    <img
      src="/assets/ui/icons/Icon_MyLand2.png"
      alt="Lands"
      class="w-8 h-8 bg-cover"
    />
    <span class="text-xs">My Lands</span>
  </ToolbarButton>
  <ToolbarButton
    active={'auctions' === uiStore.toolbarActive}
    onclick={() => {
      if (uiStore.toolbarActive === 'auctions') {
        uiStore.toolbarActive = null;
      } else {
        uiStore.toolbarActive = 'auctions';
      }
    }}
  >
    <img
      src="/assets/ui/icons/Icon_Auction.png"
      alt="Auctions"
      class="w-8 h-8 bg-cover"
    />
    <span class="text-xs">Auctions</span>
  </ToolbarButton>
  <ToolbarButton
    active={'notifications' === uiStore.toolbarActive}
    onclick={() => {
      if (uiStore.toolbarActive === 'notifications') {
        uiStore.toolbarActive = null;
      } else {
        uiStore.toolbarActive = 'notifications';
      }
    }}
  >
    <img
      src="/assets/ui/icons/Icon_Notification.png"
      alt="Notifications"
      class="w-8 h-8 bg-cover"
    />
    <span class="text-xs">Pings</span>
  </ToolbarButton>
</div>

<ToolbarDrawer active={uiStore.toolbarActive} />

<style>
  div {
    image-rendering: pixelated;
  }
</style>
