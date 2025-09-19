<script lang="ts">
    import { walletStore } from "../stores/wallet.svelte";
    import accountDataProvider, { setup } from '../account.svelte.js';
    const totalBalance = $derived(walletStore.totalBalance);

    import { onMount } from "svelte";

    onMount(() => {
        console.log("WalletBalance mounted");
        console.log(totalBalance);
    });
</script>

<div>
    {#if accountDataProvider?.address}
        <button onclick={() => walletStore.update(accountDataProvider.address!)}>Update</button>
    {/if}
    hello
    {totalBalance}
</div>