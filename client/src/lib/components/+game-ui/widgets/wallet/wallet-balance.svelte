<script lang="ts">
  import TokenAvatar from '$lib/components/ui/token-avatar/token-avatar.svelte';
  import data from '$profileData';
  import TokenValueDisplay from './token-value-display.svelte';
  import WalletSwap from './wallet-swap.svelte';
  import RotatingCoin from '$lib/components/loading-screen/rotating-coin.svelte';
  import { walletStore } from '$lib/stores/wallet.svelte';
  import accountData from '$lib/account.svelte';

  const baseToken = data.availableTokens.find(
    (token) => token.address === data.mainCurrencyAddress,
  );

  const address = $derived(accountData.address);

  let loadingBalance = $state(false);

  const handleRefreshBalances = async () => {
    if (!address) return;

    loadingBalance = true;
    try {
      await walletStore.update(address);
    } finally {
      loadingBalance = false;
    }
  };

  // Get reactive values from the store
  const errorMessage = $derived(walletStore.errorMessage);
  const totalBalance = $derived(walletStore.totalBalance);
</script>

<div class="flex items-center border-t border-gray-700 mt-2 gap-2 p-2">
  {#if totalBalance && baseToken}
    <TokenAvatar token={baseToken} class="h-6 w-6" />
    <div class="flex flex-1 items-center justify-between select-text">
      <div class="font-ponzi-number">
        {totalBalance.toString()}
      </div>
      <div class="font-ponzi-number">
        {baseToken.symbol}
      </div>
    </div>
  {/if}
  {#if loadingBalance}
    <div class="w-6 h-6 flex items-center justify-center">
      <RotatingCoin />
    </div>
  {:else}
    <button
      onclick={handleRefreshBalances}
      aria-label="Refresh Balances"
      class="w-6 h-6 flex items-center justify-center"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 32 32"
        width="32px"
        height="32px"
        fill="currentColor"
        class="h-5 w-5"
        ><path
          d="M 6 4 L 6 6 L 4 6 L 4 8 L 2 8 L 2 10 L 6 10 L 6 26 L 17 26 L 17 24 L 8 24 L 8 10 L 12 10 L 12 8 L 10 8 L 10 6 L 8 6 L 8 4 L 6 4 z M 15 6 L 15 8 L 24 8 L 24 22 L 20 22 L 20 24 L 22 24 L 22 26 L 24 26 L 24 28 L 26 28 L 26 26 L 28 26 L 28 24 L 30 24 L 30 22 L 26 22 L 26 6 L 15 6 z"
        /></svg
      >
    </button>
  {/if}
</div>

{#if errorMessage}
  <div
    class="text-red-500 bg-red-50 border border-red-200 rounded p-2 mb-2 text-center"
  >
    {errorMessage}
  </div>
{/if}

<div class="flex flex-col gap-4">
  <div>
    {#each walletStore.tokenBalances as [token, balance]}
      <div
        class="flex justify-between items-center relative gap-2 px-4 select-text"
      >
        <TokenAvatar {token} />
        <TokenValueDisplay amount={balance.toBigint()} {token} />
        <a
          href="/dashboard#{token.symbol}"
          target="_blank"
          aria-label="View on dashboard"
        >
          <svg
            width="16"
            height="15"
            viewBox="0 0 22 21"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="11.13"
              cy="10.6975"
              r="9.63081"
              stroke="white"
              stroke-opacity="0.5"
              stroke-width="1.28411"
            />
            <path
              d="M10.2795 16.5045V8.14845H11.6722V16.5045H10.2795ZM10.2795 6.75577V5.36309H11.6722V6.75577H10.2795Z"
              fill="white"
            />
          </svg>
        </a>
      </div>
    {/each}
  </div>

  <WalletSwap />
</div>
