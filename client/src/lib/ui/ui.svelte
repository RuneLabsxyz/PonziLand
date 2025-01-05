<script lang="ts">
    import AuctionModal from './auctionmodal.svelte';
    import Modal from './buymodal.svelte';
    import Sidebar from './sidebar.svelte';

    import {
        getAuctionData,
        getModalData,
        getShowModal,
        handleBuy,
        handleCancel,
    } from '$lib/stores/ui.svelte';
    import Toolbar from './toolbar.svelte';
</script>

<Toolbar />
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
