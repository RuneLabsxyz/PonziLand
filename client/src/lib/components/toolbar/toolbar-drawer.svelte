<script lang="ts">
  import { Card } from '../ui/card';
  import ToolbarDrawerAuctions from './toolbar-drawer-auctions.svelte';
  import ToolbarDrawerLands from './toolbar-drawer-lands.svelte';
  import ToolbarDrawerPings from './toolbar-drawer-pings.svelte';

  let { active } = $props<{
    active: 'lands' | 'notifications' | 'auctions' | null;
  }>();
</script>

<div class={`ponzi-toolbar-drawer flex flex-col ${active ? 'active' : ''}`}>
  <Card class="w-full h-full flex flex-col">
    {#if active === 'auctions'}
      <ToolbarDrawerAuctions />
    {/if}

    {#if active === 'lands'}
      <ToolbarDrawerLands />
    {/if}

    {#if active === 'notifications'}
      <ToolbarDrawerPings />
    {/if}
  </Card>
</div>

<style>
  .ponzi-toolbar-drawer {
    position: fixed;
    top: 0;
    left: 0;
    height: calc(100vh - 5rem); /* Adjust height as needed */
    width: 350px; /* Adjust width as needed */
    box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
    transform: translateX(-100%);
    transition: transform 0.3s ease-in-out;
    z-index: 20; /* Ensure it stays above other content */
  }

  .ponzi-toolbar-drawer.active {
    transform: translateX(0);
  }
</style>
