<script lang="ts">
    import { walletStore } from "../stores/wallet.svelte";
    import accountDataProvider, { setup } from '../account.svelte.js';
    import data from '../variables/mainnet.json';
    import { shortenAddress } from '../utils';

    const baseToken = data.availableTokens.find(
        (token) => token.address === data.mainCurrencyAddress,
    );


    const address = $derived(accountDataProvider.address!);

    let loadingBalance = $state(false);
    let errorMessage = $state<string | null>(null);
    let isOpen = $state(false);


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
  const tokenPrices = $derived(walletStore.tokenPrices);
</script>

<div class="card">
    <div class="header">
        <div class="left">
            <div class="title-group">
                <div class="title">Starknet</div>
                {#if address}
                    <div class="address">{shortenAddress(address)}</div>
                {/if}
            </div>
        </div>
        <div class="right">
            <button
                class="refresh"
                disabled={loadingBalance || !address}
                aria-label="Refresh balances"
                onclick={handleRefreshBalances}
            >
                {#if loadingBalance}⟳{:else}⟲{/if}
            </button>
            <div class="balance">
                {totalBalance ? totalBalance.toString() : '-'}
            </div>
            <button
                class="toggle"
                aria-label="Toggle balances"
                onclick={() => (isOpen = !isOpen)}
            >
                {#if isOpen}
                    ▼
                {:else}
                    ▶
                {/if}
            </button>
        </div>
    </div>

    {#if isOpen}
        <div class="list">
            {#each walletStore.tokenBalances as [token, balance]}
            <div class="row">
               <div class="token">
                   <span class="token-name">{token.name}</span>
                   <span class="token-symbol">{token.symbol}</span>
               </div>
               <div class="token-balance">{balance.toString()}</div>
            </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .card {
        width: 20rem;
        border-radius: 6px;
        overflow: hidden;
        display: block;
        padding: 0;
        border: none;
        font-family: 'PonziNumber', sans-serif;
        color: #e0e0e0;
    }
    .header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        background: #373A4E;
        padding: 12px 16px;
    }
    .left {
        display: flex;
        align-items: flex-start;
        gap: 8px;
    }
    .toggle {
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        transition: color 150ms ease-in-out;
        padding: 0;
        font-size: 14px;
        line-height: 1;
    }
    .toggle:hover { color: #fff; }

    .title { font-size: 14px; font-weight: 300; }
    .address {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
        word-break: break-all;
        font-family: 'PonziDS', sans-serif;
    }
    .right {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .refresh {
        font-size: 12px;
        padding: 2px 8px;
        border-radius: 4px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: transparent;
        color: inherit;
        cursor: pointer;
    }
    .refresh:hover { background: rgba(255, 255, 255, 0.1); }
    .refresh:disabled { opacity: 0.5; cursor: not-allowed; }

    .balance { font-size: 14px; font-variant-numeric: tabular-nums; }

    .list {
        padding-bottom: 8px;
        background-color: #181A28;
        width: 100%;
        display: block;
    }
    .row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        user-select: text;
    }
    .token { display: flex; align-items: center; gap: 8px; }
    .token-name { font-size: 14px; }
    .token-symbol { font-size: 12px; color: rgba(255, 255, 255, 0.6); }
    .token-balance { font-size: 14px; }
</style>