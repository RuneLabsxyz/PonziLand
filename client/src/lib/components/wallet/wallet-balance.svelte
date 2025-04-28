<script lang="ts">
  import type { TokenBalances } from '@dojoengine/torii-wasm/node';
  import accountData from '$lib/account.svelte';
  import { fetchTokenBalance } from '$lib/accounts/balances';
  import * as Avatar from '$lib/components/ui/avatar/index.js';
  import { useDojo } from '$lib/contexts/dojo';
  import data from '$profileData';
  import { dojoConfig } from '$lib/dojoConfig';
  import { DojoProvider } from '@dojoengine/core';
  import { ScrollArea } from '../ui/scroll-area';
  import TokenDisplay from '../ui/token-display/token-display.svelte';
  import type { Token } from '$lib/interfaces';
  import { getTokenPrices } from '$lib/components/defi/ekubo/requests';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { BASE_TOKEN } from '$lib/const';
  import { padAddress } from '$lib/utils';
  import { onMount } from 'svelte';
  import type { SubscriptionCallbackArgs } from '@dojoengine/sdk';
  import type { Subscription, TokenBalance } from '@dojoengine/torii-client';

  const { store, client: sdk, accountManager } = useDojo();
  const address = $derived(accountData.address);

  // -------------------------------------------------

  let tokenBalances = $state<{ token: Token; balance: bigint; icon: string }[]>(
    [],
  );

  let tokenPrices = $state<
    { symbol: string; address: string; ratio: number | null }[]
  >([]);

  let totalBalanceInBaseToken = $state<CurrencyAmount | null>(null);

  // -------------------------------------------------

  let subscriptionRef = $state<Subscription>();

  async function calculateTotalBalance() {
    if (!tokenBalances.length || !tokenPrices.length) return;

    let totalValue = 0;

    const resolvedBalances = await Promise.all(
      tokenBalances.map(async (tb) => {
        return {
          token: tb.token,
          balance: await tb.balance,
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

  const setTokenBalances = (items: TokenBalance[]) => {
    const itemBalances = items.map((item) => {
      const token = data.availableTokens.find(
        (token) => token.address === padAddress(item.contract_address),
      );
      if (!token) {
        return null;
      }
      // Convert the balance to a BigInt
      const balance = BigInt(item.balance);

      return {
        token,
        balance,
        icon: token.images.icon,
      };
    });

    const cleanedTokenBalances = itemBalances.filter((item) => item !== null);

    tokenBalances = cleanedTokenBalances as {
      token: Token;
      balance: bigint;
      icon: string;
    }[];
  };

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

    tokenPrices = await getTokenPrices();
    setTokenBalances(tokenBalances.items);
    calculateTotalBalance();
  };

  const updateTokenBalance = (item: TokenBalance) => {
    const token = data.availableTokens.find(
      (token) => token.address === padAddress(item.contract_address),
    );
    if (!token) {
      return null;
    }
    // Convert the balance to a BigInt
    const balance = BigInt(item.balance);

    const tokenBalance = {
      token,
      balance,
      icon: token.images.icon,
    };

    const index = tokenBalances.findIndex(
      (tb) => tb.token.address === tokenBalance.token.address,
    );

    if (index !== -1) {
      tokenBalances[index] = tokenBalance;
    } else {
      tokenBalances.push(tokenBalance);
    }
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
<!-- 
<ScrollArea class="h-36 w-full">
  <div class="mr-3 flex flex-col gap-1">
    {#each tokenBalances as tokenBalance}
      {#await tokenBalance.balance}
        <div class="flex justify-between items-center">
          <div class="flex flex-col items-end">
            <div>loading...</div>
            <span class="text-gray-500">loading</span>
          </div>
        </div>
      {:then balance}
        <div class="flex justify-between items-center relative">
          <Avatar.Root class="h-6 w-6">
            <Avatar.Image
              src={tokenBalance.token.images.icon}
              alt={tokenBalance.token.symbol}
            />
            <Avatar.Fallback>{tokenBalance.token.symbol}</Avatar.Fallback>
          </Avatar.Root>
          <TokenDisplay amount={balance ?? 0n} token={tokenBalance.token} />
        </div>
      {/await}
    {/each}
  </div>
</ScrollArea> -->

<ScrollArea class="h-36 w-full">
  <div class="mr-3 flex flex-col gap-1">
    {#each tokenBalances as tokenBalance}
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
