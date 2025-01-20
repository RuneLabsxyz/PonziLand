<script lang="ts">
  import type { AuctionData, BuyData, TileInfo } from '$lib/interfaces';
  import AuctionModal from './auction/auction-modal.svelte';
  import BuyModal from './buy/buy-modal.svelte';
  import LandHud from './land/hud/land-hud.svelte';
  import WalletLookup from './wallet/wallet-lookup.svelte';
  import { uiStore } from '$lib/stores/stores.svelte';
  import Toolbar from './toolbar/toolbar.svelte';
</script>

<div class="z-50 absolute top-0 left-0">
  <!-- Wallet Lookup -->
  <WalletLookup />

  <!-- Tile HUD -->
  <LandHud />

  <Toolbar />

  <!-- Modals -->
  {#if uiStore.showModal}
    {#if uiStore.auctionData}
      <AuctionModal />
    {:else}
      <BuyModal />
    {/if}
  {/if}
</div>
