<script lang="ts" context="module">
  import type { BaseLand } from '$lib/api/land';
  import { widgetsStore } from '$lib/stores/widgets.store';

  // Function to open buy land widget
  export function openBuyLandWidget(land: BaseLand) {
    widgetsStore.addWidget({
      id: `buy-land-${land.location.x}-${land.location.y}`,
      type: 'buy-land',
      position: { x: 300, y: 100 },
      isMinimized: false,
      isOpen: true,
      data: { land },
    });
  }

  // Function to open land info widget
  export function openLandInfoWidget(land: LandWithActions) {
    console.log('openLandInfoWidget', land);
    // Ensure land data is fully processed
    if (!land.token || !land.location) {
      console.warn('Land data not fully processed yet, waiting...');
      setTimeout(() => openLandInfoWidget(land), 100);
      return;
    }
    
    widgetsStore.addWidget({
      id: `land-info-${land.location}`,
      type: 'land-info',
      position: { x: 300, y: 100 },
      isMinimized: false,
      isOpen: true,
      data: { land },
    });
  }
</script>

<script lang="ts">
  import AuctionModal from '$lib/components/auction/auction-modal.svelte';
  import BuyModal from '$lib/components/buy/buy-modal.svelte';
  import BuyLandWidget from '$lib/components/buy/buy-land-widget.svelte';
  import LandInfoModal from '$lib/components/land/land-info-modal.svelte';
  import LandInfoWidget from '$lib/components/land/land-info-widget.svelte';
  import Toolbar from '$lib/components/toolbar/toolbar.svelte';
  import InfoModal from '$lib/components/ui/info-modal.svelte';
  import TxNotificationZone from '$lib/components/ui/tx-notification-zone.svelte';
  import WalletLookup from '$lib/components/wallet/wallet-lookup.svelte';
  import { uiStore } from '$lib/stores/ui.store.svelte';
  import { Info } from 'lucide-svelte';
  import Draggable from './draggable.svelte';
  import LandHud from '$lib/components/land/hud/land-hud.svelte';
  import { onMount } from 'svelte';
  import type { LandWithActions } from '$lib/api/land.svelte';
  import WidgetLauncher from '$lib/components/widgets/widget-launcher.svelte';

  onMount(() => {
   
  });
</script>

<div
  class="z-50 absolute top-0 left-0 right-0 bottom-0"
  style="pointer-events: none;"
>
  <WidgetLauncher />
  
  {#each Object.entries($widgetsStore) as [id, widget]}
    {#if widget.isOpen}
      <Draggable {id} type={widget.type} initialPosition={widget.position}>
        {#if widget.type === 'wallet'}
          <WalletLookup />
        {:else if widget.type === 'land-hud'}
          <LandHud />
        {:else if widget.type === 'buy-land' && widget.data?.land}
          <BuyLandWidget land={widget.data.land} />
        {:else if widget.type === 'land-info' && widget.data?.land}
          <LandInfoWidget land={widget.data.land} />
        {/if}
      </Draggable>
    {/if}
  {/each}

  <InfoModal isDisplay={uiStore.modalInfo} />
</div>
