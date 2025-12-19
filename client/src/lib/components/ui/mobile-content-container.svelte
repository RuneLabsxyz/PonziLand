<script lang="ts">
  import {
    activeTab,
    mobileLandSelection,
    marketViewState,
    backToMarket,
  } from '$lib/stores/mobile-nav.store';
  import WidgetWallet from '../+game-ui/widgets/wallet/widget-wallet.svelte';
  import WidgetCommandCenter from '../+game-ui/widgets/command-center/widget-command-center.svelte';
  import WidgetMarket from '../+game-ui/widgets/market/widget-market.svelte';
  import MobileZoomSlider from './mobile-zoom-slider.svelte';
  import LandInfos from '../+game-ui/widgets/land-info/land-infos.svelte';
  import { createLandWithActions } from '$lib/utils/land-actions';
  import { landStore } from '$lib/stores/store.svelte';
  import Button from './button/button.svelte';
  import { ChevronLeft } from 'lucide-svelte';
  import WidgetSwap from '../+game-ui/widgets/swap/widget-swap.svelte';

  // Dummy setCustomControls and setCustomTitle functions for widget compatibility
  function setCustomControls() {}
  function setCustomTitle() {}

  // Create land with actions for the selected land
  let landWithActions = $derived(
    $mobileLandSelection
      ? createLandWithActions($mobileLandSelection, () =>
          landStore.getAllLands(),
        )
      : null,
  );
</script>

<!-- Mobile content container that shows full screen widgets -->
<div
  class="fixed inset-0 z-30 mobile-vh-fix text-white p-2"
  class:bg-ponzi={$activeTab !== 'map'}
  style="pointer-events: {$activeTab === 'map'
    ? 'none'
    : 'all'}; bottom: calc(64px + var(--safe-area-inset-bottom, 0px)); height: calc(var(--vh, 1vh) * 100 - 64px - var(--safe-area-inset-bottom, 0px));"
>
  {#if $activeTab === 'map'}
    <!-- Map view with zoom controls for mobile -->
    <MobileZoomSlider />
  {:else if $activeTab === 'command-center'}
    <!-- Command Center widget in full screen -->
    <div class="h-full">
      <h2 class="text-2xl font-ponzi-number text-white mb-4">Command Center</h2>
      <WidgetCommandCenter {setCustomTitle} {setCustomControls} />
    </div>
  {:else if $activeTab === 'wallet'}
    <!-- Wallet widget in full screen -->
    <div class="h-full overflow-y-scroll">
      <h2 class="text-2xl font-ponzi-number text-white mb-4">Wallet</h2>
      <WidgetWallet {setCustomControls} />
      <WidgetSwap />
    </div>
  {:else if $activeTab === 'market'}
    <!-- Market view with land details -->
    {#if $marketViewState === 'land-details' && landWithActions}
      <!-- Land Details view with back button -->
      <div class="h-full flex flex-col">
        <div class="flex items-center gap-2 mb-4">
          <Button
            size="sm"
            onclick={() => backToMarket()}
            class="flex items-center gap-1 bg-white/10 hover:bg-white/20"
          >
            <ChevronLeft class="w-4 h-4" />
            Back to Market
          </Button>
        </div>
        <div class="flex-1 overflow-auto">
          <LandInfos land={landWithActions} />
        </div>
      </div>
    {:else}
      <!-- Market widget -->
      <div class="h-full">
        <h2 class="text-2xl font-ponzi-number text-white mb-4">Market</h2>
        <WidgetMarket {setCustomControls} />
      </div>
    {/if}
  {/if}
</div>
