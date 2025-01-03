<script lang="ts">
    import AuctionModal from "./auctionmodal.svelte";
    import Modal from "./buymodal.svelte";
    import Sidebar from "./sidebar.svelte";

    import {
        getAuctionData,
        getModalData,
        getShowModal,
        handleBuy,
        handleCancel,
    } from "$lib/stores/ui.svelte";
</script>

<div class="z-50 absolute top-0 left-0">
    <Sidebar />
    {#if getShowModal()}
        {#if getModalData()?.owner}
            <Modal
                onCancel={handleCancel}
                onBuy={handleBuy}
                data={getModalData()}
            />
        {:else}
            <AuctionModal
                onCancel={handleCancel}
                onBuy={handleBuy}
                data={getAuctionData()}
            />
        {/if}
    {/if}
</div>
