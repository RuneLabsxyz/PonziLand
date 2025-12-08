<script lang="ts">
  import { activeTab } from '$lib/stores/mobile-nav.store';
  import WidgetWallet from '../+game-ui/widgets/wallet/widget-wallet.svelte';
  import WidgetCommandCenter from '../+game-ui/widgets/command-center/widget-command-center.svelte';

  // Dummy setCustomControls and setCustomTitle functions for widget compatibility
  function setCustomControls() {}
  function setCustomTitle() {}
</script>

<!-- Mobile content container that shows full screen widgets -->
<div
  class="md:hidden fixed inset-0 z-30 mobile-vh-fix"
  class:bg-black={$activeTab !== 'map'}
  class:bg-opacity-95={$activeTab !== 'map'}
  style="pointer-events: {$activeTab === 'map' ? 'none' : 'all'}; bottom: calc(64px + var(--safe-area-inset-bottom, 0px)); height: calc(var(--vh, 1vh) * 100 - 64px - var(--safe-area-inset-bottom, 0px));"
>
  <div class="flex flex-col h-full">
    <!-- Content area (full screen minus bottom navbar) -->
    <div class="flex-1 overflow-auto" class:p-4={$activeTab !== 'map'}>
      {#if $activeTab === 'map'}
        <!-- Map view - transparent to show the underlying game map -->
        <!-- No content needed, the map is visible underneath -->
      {:else if $activeTab === 'command-center'}
        <!-- Command Center widget in full screen -->
        <div class="h-full">
          <h2 class="text-2xl font-ponzi-number text-white mb-4">
            Command Center
          </h2>
          <div class="bg-black/50 rounded-lg p-4 h-full">
            <WidgetCommandCenter {setCustomTitle} {setCustomControls} />
          </div>
        </div>
      {:else if $activeTab === 'wallet'}
        <!-- Wallet widget in full screen -->
        <div class="h-full">
          <h2 class="text-2xl font-ponzi-number text-white mb-4">Wallet</h2>
          <div class="bg-black/50 rounded-lg p-4">
            <WidgetWallet {setCustomControls} />
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>
