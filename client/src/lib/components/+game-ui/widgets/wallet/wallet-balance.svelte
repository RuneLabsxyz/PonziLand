<script lang="ts">
  import accountData from '$lib/account.svelte';
  import { getBalances, type BalanceResponse } from '$lib/api/balances';
  import TokenAvatar from '$lib/components/ui/token-avatar/token-avatar.svelte';
  import { useDojo } from '$lib/contexts/dojo';
  import {
    setTokenBalances,
    tokenStore,
  } from '$lib/stores/tokens.store.svelte';
  import data from '$profileData';
  import { onMount } from 'svelte';
  import TokenValueDisplay from './token-value-display.svelte';
  import WalletSwap from './wallet-swap.svelte';
  import RotatingCoin from '$lib/components/loading-screen/rotating-coin.svelte';

  const baseToken = data.availableTokens.find(
    (token) => token.address === data.mainCurrencyAddress,
  );

  // Try to get Dojo context, but don't crash if it's not initialized
  let sdk: any = $state(null);

  try {
    const dojoContext = useDojo();
    sdk = dojoContext.client;
  } catch (error) {
    console.warn('Dojo not initialized yet:', error);
    // Continue without Dojo - will use RPC fallback
  }

  const address = $derived(accountData.address);

  let balanceData = $state<BalanceResponse | null>(null);
  let errorMessage = $state<string | null>(null);
  let loadingBalance = $state<boolean>(false);

  async function loadBalances() {
    if (!address) return;

    errorMessage = null;
    loadingBalance = true;

    try {
      console.log('Sending request to get balances');
      const response = await getBalances(address, sdk);
      console.log('response', response);
      balanceData = response;

      // Update store
      setTokenBalances(
        response.balances.map((balance) => ({
          ...balance,
          account_address: balance.account_address || address,
          contract_address: balance.contract_address || balance.token.address,
          token_id: balance.token_id || balance.token.symbol,
        })),
      );
      tokenStore.prices = response.prices;
    } catch (err) {
      errorMessage = 'Failed to refresh balances. Please try again.';
      console.error(err);
    } finally {
      loadingBalance = false;
    }
  }

  $effect(() => {
    if (address) {
      loadBalances();
    }
  });

  onMount(() => {
    loadBalances();
  });
</script>

{#if errorMessage}
  <div
    class="text-red-500 bg-red-50 border border-red-200 rounded p-2 mb-2 text-center"
  >
    {errorMessage}
  </div>
{/if}

{#if balanceData?.totalBalanceInBaseToken && baseToken}
  <div class="flex items-center border-t border-gray-700 mt-2 gap-2 p-2">
    <TokenAvatar token={baseToken} class="h-6 w-6" />
    <div class="flex flex-1 items-center justify-between select-text">
      <div class="font-ponzi-number">
        {balanceData.totalBalanceInBaseToken.toString()}
      </div>
      <div class="font-ponzi-number">
        {baseToken.symbol}
      </div>
    </div>
    {#if loadingBalance}
      <div class="w-6 h-6 flex items-center justify-center">
        <RotatingCoin />
      </div>
    {:else}
      <button
        onclick={loadBalances}
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
{/if}

<div class="flex flex-col gap-4">
  <div>
    {#each tokenStore.balances as tokenBalance}
      <div
        class="flex justify-between items-center relative gap-2 px-4 select-text"
      >
        <TokenAvatar token={tokenBalance.token} />
        <TokenValueDisplay
          amount={tokenBalance.balance}
          token={tokenBalance.token}
        />
        <a
          href="/dashboard#{tokenBalance.token.symbol}"
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
