<script lang="ts">
    import Sidebar from './sidebar.svelte';
    import TileHUD from './tilehud.svelte';
    import Modal from './buymodal.svelte';
    import AuctionModal from './auctionmodal.svelte';
    import type { TileInfo, BuyData, AuctionData } from '$lib/interfaces';
  import WalletLookup from './wallet/wallet-lookup.svelte';

    let showModal = $state<boolean>(false);
    let modalData = $state<TileInfo | null>(null);
    let auctionData = $state<AuctionData | null>(null);

    function handleTileBuy(info: TileInfo) {
        modalData = info;
        showModal = true;
    }

    function handleAuctionBuy(info: AuctionData) {
        auctionData = info;
        showModal = true;
    }

    function handleCancel(): void {
        showModal = false;
        auctionData = null;
        modalData = null;
    }

    function handleBuy(data: BuyData): void {
        console.log("Buying land with data:", $state.snapshot(auctionData));
        // TODO: call buyTile function + front end sugar
        showModal = false;
    }
</script>

<div class="z-50 absolute top-0 left-0">
    <Sidebar />
    <TileHUD onBuyTile={handleTileBuy} onBidTile={handleAuctionBuy}/>
    <WalletLookup />
    {#if showModal}
        {#if modalData?.owner}
        <Modal
            onCancel={handleCancel}
            onBuy={handleBuy}
            data={modalData}
            />
        {:else}
            <AuctionModal
                onCancel={handleCancel}
                onBuy={handleBuy}
                data={auctionData}
            />
        {/if}
    {/if}
</div>
