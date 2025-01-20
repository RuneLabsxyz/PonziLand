<script lang="ts">
  import { uiStore } from '$lib/stores/stores.svelte';
  import AuctionModal from './auction/auction-modal.svelte';
  import BuyModal from './buy/buy-modal.svelte';
  import LandHud from './land/hud/land-hud.svelte';
  import Toolbar from './toolbar/toolbar.svelte';
  import WalletLookup from './wallet/wallet-lookup.svelte';
</script>

<div class="z-50 absolute top-0 left-0">
  <!-- Wallet Lookup -->
  <WalletLookup />

  <!-- Tile HUD -->
  <LandHud />

  <Toolbar />

  <!-- Modals -->
  {#if uiStore.showModal}
    {#if uiStore.modalType == 'buy'}
      <BuyModal />
    {:else if uiStore.modalType == 'bid'}
      <AuctionModal />
    {/if}
  {/if}
</div>
