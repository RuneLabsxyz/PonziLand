<script lang="ts">
  import AuctionModal from '$lib/components/auction/auction-modal.svelte';
  import BuyModal from '$lib/components/buy/buy-modal.svelte';
  import LandInfoModal from '$lib/components/land/land-info-modal.svelte';
  import Toolbar from '$lib/components/toolbar/toolbar.svelte';
  import InfoModal from '$lib/components/ui/info-modal.svelte';
  import TxNotificationZone from '$lib/components/ui/tx-notification-zone.svelte';
  import WalletLookup from '$lib/components/wallet/wallet-lookup.svelte';
  import { uiStore } from '$lib/stores/ui.store.svelte';
  import { Info } from 'lucide-svelte';
  import Draggable from './draggable.svelte';
  import LandHud from '$lib/components/land/hud/land-hud.svelte';
  import { widgetsStore } from '$lib/stores/widgets.store';
  import { onMount } from 'svelte';

  // let { store } = $props();

  onMount(() => {
    // Initialize WalletLookup widget
    widgetsStore.addWidget({
      id: 'wallet-lookup',
      type: 'wallet',
      position: { x: 100, y: 100 },
      isMinimized: false,
      isOpen: true
    });

    // Initialize LandHud widget
    widgetsStore.addWidget({
      id: 'land-hud',
      type: 'land-hud',
      position: { x: 100, y: 200 },
      isMinimized: false,
      isOpen: true
    });
  });
</script>

<div class="z-50 absolute top-0 left-0 right-0 bottom-0" style="pointer-events: none;">
  {#each Object.entries($widgetsStore) as [id, widget]}
    {#if widget.isOpen}
      <Draggable {id} type={widget.type} initialPosition={widget.position}>
        {#if widget.type === 'wallet'}
          <WalletLookup />
        {:else if widget.type === 'land-hud'}
          <LandHud />
        {/if}
      </Draggable>
    {/if}
  {/each}

  <TxNotificationZone />
  <Toolbar />

  <InfoModal isDisplay={uiStore.modalInfo} />

  {#if uiStore.showModal}
    {#if uiStore.modalType == 'buy'}
      <BuyModal />
    {:else if uiStore.modalType == 'bid'}
      <AuctionModal />
    {:else if uiStore.modalType == 'land-info'}
      <LandInfoModal />
    {/if}
  {/if}
</div>
