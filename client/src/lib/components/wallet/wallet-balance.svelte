<script lang="ts">
  import accountData from '$lib/account.svelte';
  import { getTokenPrices } from '$lib/components/defi/ekubo/requests';
  import * as Avatar from '$lib/components/ui/avatar/index.js';
  import { BASE_TOKEN } from '$lib/const';
  import { useDojo } from '$lib/contexts/dojo';
  import data from '$profileData';
  import { ScrollArea } from '../ui/scroll-area';
  import TokenDisplay from '../ui/token-display/token-display.svelte';
  import type { Token } from '$lib/interfaces';
  import { padAddress } from '$lib/utils';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import type { SubscriptionCallbackArgs } from '@dojoengine/sdk';
  import type { Subscription, TokenBalance } from '@dojoengine/torii-client';
  import { onMount } from 'svelte';
  import { ScrollArea } from '../ui/scroll-area';
  import TokenDisplay from '../ui/token-display/token-display.svelte';
  import {
    setTokenBalances,
    tokenStore,
    updateTokenBalance,
  } from '$lib/stores/tokens.svelte';

  const { client: sdk } = useDojo();
  const address = $derived(accountData.address);

  let totalBalanceInBaseToken = $state<CurrencyAmount | null>(null);

  let subscriptionRef = $state<Subscription>();

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
        const priceInfo = tokenPrices.find((p) => p.address === token.address);
        if (priceInfo?.ratio !== null && priceInfo) {
          totalValue += Number(
            amount.rawValue().dividedBy(priceInfo.ratio || 0),
          );
        }
      }
    }
    const baseToken = data.availableTokens.find(
      (token) => token.address === BASE_TOKEN,
    );
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
          console.log('Token balance update:', data);
          updateTokenBalance(data);
          calculateTotalBalance();
        }
        if (error) {
          console.error(error);
          return;
        }
      },
    });
    // Add the subscription ref
    subscriptionRef = subscription;

    tokenStore.prices = await getTokenPrices();
    setTokenBalances(tokenBalances.items);
    calculateTotalBalance();
  };
</script>

{#if totalBalanceInBaseToken}
  <div class="mt-2 pt-2 border-t border-gray-700 pb-4">
    <div class="flex justify-between items-center">
      <span class="text-sm font-bold">Your score:</span>
      <span class="font-bold text-green-500"
        >{totalBalanceInBaseToken.toString()}</span
      >
    </div>
  </div>
{/if}

<div class="flex justify-between items-center mr-3 mb-2">
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
</div>

<ScrollArea class="h-36 w-full">
  <div class="mr-3 flex flex-col gap-1">
    {#each tokenStore.balances as tokenBalance}
      <div class="flex justify-between items-center relative">
        <Avatar.Root class="h-6 w-6">
          <Avatar.Image
            src={tokenBalance.token.images.icon}
            alt={tokenBalance.token.symbol}
          />
          <Avatar.Fallback>{tokenBalance.token.symbol}</Avatar.Fallback>
        </Avatar.Root>
        <TokenDisplay
          amount={tokenBalance.balance}
          token={tokenBalance.token}
        />
      </div>
    {/each}
  </div>
</ScrollArea>
