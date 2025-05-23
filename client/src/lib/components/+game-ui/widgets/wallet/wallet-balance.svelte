<script lang="ts">
  import accountData from '$lib/account.svelte';
  import { getTokenPrices } from '$lib/api/defi/ekubo/requests';
  import { ScrollArea } from '$lib/components/ui/scroll-area';
  import TokenAvatar from '$lib/components/ui/token-avatar/token-avatar.svelte';
  import TokenDisplay from '$lib/components/ui/token-display/token-display.svelte';
  import { useDojo } from '$lib/contexts/dojo';
  import {
    setTokenBalances,
    tokenStore,
    updateTokenBalance,
  } from '$lib/stores/tokens.store.svelte';
  import { padAddress } from '$lib/utils';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import data from '$profileData';
  import type { SubscriptionCallbackArgs } from '@dojoengine/sdk';
  import type { Subscription, TokenBalance } from '@dojoengine/torii-client';
  import { onMount } from 'svelte';
  import TokenValueDisplay from './token-value-display.svelte';
  import WalletSwap from './wallet-swap.svelte';

  const BASE_TOKEN = data.mainCurrencyAddress;
  const baseToken = data.availableTokens.find(
    (token) => token.address === BASE_TOKEN,
  );

  const { client: sdk } = useDojo();
  const address = $derived(accountData.address);

  let totalBalanceInBaseToken = $state<CurrencyAmount | null>(null);

  let subscriptionRef = $state<Subscription>();

  let errorMessage = $state<string | null>(null);

  async function calculateTotalBalance() {
    const tokenBalances = tokenStore.balances;
    const tokenPrices = tokenStore.prices;

    if (!tokenBalances.length || !tokenPrices.length) return;

    let totalValue = 0;

    const resolvedBalances = await Promise.all(
      tokenBalances.map(async (tb) => {
        return {
          token: tb.token,
          balance: tb.balance,
        };
      }),
    );

    for (const { token, balance } of resolvedBalances) {
      if (balance === null) continue;

      const amount = CurrencyAmount.fromUnscaled(balance.toString(), token);

      if (padAddress(token.address) === BASE_TOKEN) {
        totalValue += Number(amount.rawValue());
      } else {
        const priceInfo = tokenPrices.find((p) => {
          return padAddress(p.address) == padAddress(token.address);
        });

        if (priceInfo?.ratio !== null && priceInfo) {
          totalValue += Number(
            amount.rawValue().dividedBy(priceInfo.ratio || 0),
          );
        }
      }
    }

    if (baseToken) {
      totalBalanceInBaseToken = CurrencyAmount.fromScaled(
        totalValue.toString(),
        baseToken,
      );
    }
  }

  onMount(async () => {
    await handleRefreshBalances();
  });

  const handleRefreshBalances = async () => {
    errorMessage = null;
    try {
      if (subscriptionRef) {
        subscriptionRef.cancel();
      }
      const request = {
        contractAddresses: data.availableTokens.map((token) => token.address),
        accountAddresses: address ? [address] : [],
        tokenIds: [],
      };

      const [tokenBalances, subscription] = await sdk.subscribeTokenBalance({
        contractAddresses: request.contractAddresses ?? [],
        accountAddresses: request.accountAddresses ?? [],
        tokenIds: request.tokenIds ?? [],
        callback: ({ data, error }: SubscriptionCallbackArgs<TokenBalance>) => {
          if (data) {
            updateTokenBalance(data);
            calculateTotalBalance();
          }
          if (error) {
            console.error(error);
            errorMessage = 'Failed to refresh balances. Please try again.';
            return;
          }
        },
      });
      // Add the subscription ref
      subscriptionRef = subscription;

      tokenStore.prices = await getTokenPrices();
      setTokenBalances(tokenBalances.items);
      calculateTotalBalance();
    } catch (err) {
      errorMessage =
        'Failed to refresh balances. Please check your connection and try again.';
      console.error(err);
    }
  };
</script>

{#if errorMessage}
  <div
    class="text-red-500 bg-red-50 border border-red-200 rounded p-2 mb-2 text-center"
  >
    {errorMessage}
  </div>
{/if}

{#if totalBalanceInBaseToken && baseToken}
  <div class="flex items-center border-t border-gray-700 mt-2 gap-2 p-2">
    <TokenAvatar token={baseToken} class="h-6 w-6" />
    <div class="flex flex-1 items-center justify-between select-text">
      <div class="font-ponzi-number">
        {totalBalanceInBaseToken.toString()}
      </div>
      <div class="font-ponzi-number">
        {baseToken.symbol}
      </div>
    </div>
  </div>
{/if}

<!-- <div class="flex justify-between items-center mr-3 mb-2">
  <div class="font-bold text-stroke-none">BALANCE</div>
  <button onclick={handleRefreshBalances} aria-label="Refresh balance">
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
</div> -->
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
        <!-- <div
    class="flex flex-1 items-center justify-between text-xl tracking-wide"
    >
    <div class="font-ds opacity-75 text-[#6BD5DD]">
      {tokenBalance.balance} M
      </div>
      <div class="font-ds opacity-75 text-[#D9D9D9]">
        {tokenBalance.token.symbol}
        </div>
        </div> -->
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
      </div>
    {/each}
  </div>

  <WalletSwap />
</div>