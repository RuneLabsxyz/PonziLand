<script lang="ts">
  import ToolbarButton from './toolbar-button.svelte';
  import ToolbarDrawer from './toolbar-drawer.svelte';

  let active = $state<'lands' | 'notifications' | null>(null);
</script>

<div class="fixed bottom-0 left-0 flex gap-2 z-20 p-2">
  <ToolbarButton
    active={'lands' === active}
    onclick={() => {
      if (active === 'lands') {
        active = null;
      } else {
        active = 'lands';
      }
    }}
  >
    <img
      src="/assets/ui/toolbar/lands.png"
      alt="Lands"
      class="w-8 h-8 bg-cover"
    />
    <span class="text-sm">My Lands</span>
  </ToolbarButton>
  <ToolbarButton
    active={'notifications' === active}
    onclick={() => {
      if (active === 'notifications') {
        active = null;
      } else {
        active = 'notifications';
      }
    }}
  >
    <img
      src="/assets/ui/toolbar/notifications.png"
      alt="Notifications"
      class="w-8 h-8 bg-cover"
    />
    <span class="text-sm">Notifications</span>
  </ToolbarButton>
</div>

<ToolbarDrawer {active} />

<style>
  div {
    image-rendering: pixelated;
  }
</style>
