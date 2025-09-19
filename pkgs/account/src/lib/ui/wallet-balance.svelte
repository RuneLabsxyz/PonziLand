<script lang="ts">
    import { walletStore } from "../stores/wallet.svelte";
    import accountDataProvider, { setup } from '../account.svelte.js';
    import data from '../variables/mainnet.json';

    const baseToken = data.availableTokens.find(
        (token) => token.address === data.mainCurrencyAddress,
    );


    const address = $derived(accountDataProvider.address!);

    let loadingBalance = $state(false);
    let errorMessage = $state<string | null>(null);


    const handleRefreshBalances = async () => {
        if (!address) return;

        loadingBalance = true;
        try {
        await walletStore.update(address);
        } finally {
        loadingBalance = false;
        }
    };

  const totalBalance = $derived(walletStore.totalBalance);
</script>

<div>
    {#if accountDataProvider?.address}
        <button onclick={() => walletStore.update(accountDataProvider.address!)}>Update</button>
    {/if}
    hello
    {totalBalance}
</div>

{#each walletStore.tokenBalances as [token, balance]}
<div
  class="flex justify-between items-center relative gap-2 px-4 select-text"
>
   {token.name}
{balance}
</div>
{/each}