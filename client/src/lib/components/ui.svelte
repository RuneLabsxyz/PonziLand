<script lang="ts">
  import { uiStore } from '$lib/stores/ui.store.svelte';
  import AuctionModal from './auction/auction-modal.svelte';
  import BuyModal from './buy/buy-modal.svelte';
  import LandHud from './land/hud/land-hud.svelte';
  import LandInfoModal from './land/land-info-modal.svelte';
  import Toolbar from './toolbar/toolbar.svelte';
  import WalletLookup from './wallet/wallet-lookup.svelte';
  import WarningBanner from './ui/warning-banner.svelte';
  import TxNotif from './ui/tx-notif.svelte';
</script>

<div class="z-50 absolute top-0 left-0">
  <!-- Wallet Lookup -->
  <WalletLookup />

  <!-- Leaderboard-->
  <!-- <Leaderboard /> -->

  <!-- Tile HUD -->
  <LandHud />

  <Toolbar />

  <WarningBanner />

  <TxNotif />

  <!-- Modals -->
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
