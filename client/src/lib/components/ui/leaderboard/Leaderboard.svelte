<script lang="ts">
  import accountData from '$lib/account.svelte';
  import { useDojo } from '$lib/contexts/dojo';
  import { ScrollArea } from '../../ui/scroll-area';
  import { fetchTokenBalances, baseToken } from './request';
  import { onMount } from 'svelte';
  import { useAvnu, type QuoteParams } from '$lib/utils/avnu.svelte';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import type { Token } from '$lib/interfaces';

  const { store } = useDojo();
  const address = $derived(accountData.address);
  let leaderboardData = $state<Record<string, Record<string, number>>>({});
  let userRankings = $state<Array<{ address: string; totalValue: number }>>([]);
  let isLoading = $state(true);
  const avnu = useAvnu();

  // Create token objects for Avnu quotes
  function createTokenObject(tokenAddress: string): Token {
    return {
      address: tokenAddress,
      symbol: '',
      decimals: 18,
      name: '',
      liquidityPoolType: 'AMM',
      images: {
        icon: '',
        biome: { x: 0, y: 0 },
        building: {
          1: { x: 0, y: 0 },
          2: { x: 0, y: 0 },
          3: { x: 0, y: 0 },
        },
      },
    };
  }

  async function getPriceInBaseCurrency(
    tokenAddress: string,
    amount: number,
  ): Promise<number> {
    if (!tokenAddress || !amount || amount <= 0) {
      return 0;
    }

    try {
      const sellAmount = CurrencyAmount.fromUnscaled(amount.toString());
      const quoteParams: QuoteParams = {
        sellToken: createTokenObject(tokenAddress),
        buyToken: createTokenObject(baseToken),
        sellAmount,
      };

      const quotes = await avnu.fetchQuotes(quoteParams);
      if (quotes.length > 0) {
        const priceInBaseCurrency = CurrencyAmount.fromUnscaled(
          quotes[0].buyAmount,
        );
        return Number(priceInBaseCurrency.toString());
      }
    } catch (error) {
      console.error(`Error fetching price for token ${tokenAddress}:`, error);
    }

    return 0;
  }

  async function calculateUserAssets() {
    const userAssets: Array<{ address: string; totalValue: bigint }> = [];
    const uniqueTokens = new Set<string>();
    const tokenPriceCache: Record<string, number> = {};

    for (const tokens of Object.values(leaderboardData)) {
      for (const tokenAddress in tokens) {
        if (tokenAddress !== baseToken) {
          uniqueTokens.add(tokenAddress);
        }
      }
    }

    for (const tokenAddress of uniqueTokens) {
      try {
        const priceForOneUnit = await getPriceInBaseCurrency(tokenAddress, 1);
        tokenPriceCache[tokenAddress] = priceForOneUnit;
      } catch (error) {
        console.error(`Failed to get price for token ${tokenAddress}:`, error);
        tokenPriceCache[tokenAddress] = 0;
      }
    }

    for (const [accountAddress, tokens] of Object.entries(leaderboardData)) {
      let totalInBaseCurrency = 0n;

      for (const [tokenAddress, balance] of Object.entries(tokens)) {
        if (tokenAddress === baseToken) {
          totalInBaseCurrency +=
            BigInt(balance.toString()) / 1000000000000000000n;
        } else if (tokenPriceCache[tokenAddress]) {
          totalInBaseCurrency +=
            BigInt(Math.floor(balance * tokenPriceCache[tokenAddress])) /
            1000000000000000000n;
        }
      }

      userAssets.push({
        address: accountAddress,
        totalValue: totalInBaseCurrency,
      });
    }

    return userAssets.sort((a, b) =>
      a.totalValue > b.totalValue ? -1 : a.totalValue < b.totalValue ? 1 : 0,
    );
  }

  async function refreshLeaderboard() {
    isLoading = true;
    try {
      leaderboardData = await fetchTokenBalances();
      userRankings = await calculateUserAssets();
    } catch (error) {
      console.error('Error refreshing leaderboard:', error);
    } finally {
      isLoading = false;
    }
  }

  onMount(refreshLeaderboard);

  function formatAddress(address: string): string {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }

  function formatValue(value: string): string {
    const correctedValue = value.startsWith('00x')
      ? value.replace('00x', '0x')
      : value;

    const bigValue = BigInt(correctedValue);

    return bigValue.toString(10);
  }
</script>

<div class="flex justify-between items-center mr-3 mb-2 text-white">
  <div class="text-2xl text-shadow-none">BALANCE</div>
  <button on:click={refreshLeaderboard} aria-label="Refresh balance">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width="32px"
      height="32px"
      fill="currentColor"
      class="h-5 w-5"
    >
      <path
        d="M 6 4 L 6 6 L 4 6 L 4 8 L 2 8 L 2 10 L 6 10 L 6 26 L 17 26 L 17 24 L 8 24 L 8 10 L 12 10 L 12 8 L 10 8 L 10 6 L 8 6 L 8 4 L 6 4 z M 15 6 L 15 8 L 24 8 L 24 22 L 20 22 L 20 24 L 22 24 L 22 26 L 24 26 L 24 28 L 26 28 L 26 26 L 28 26 L 28 24 L 30 24 L 30 22 L 26 22 L 26 6 L 15 6 z"
      />
    </svg>
  </button>
</div>

<ScrollArea class="h-36 w-full text-white">
  <div class="mr-3 flex flex-col gap-1">
    {#if isLoading}
      <div class="text-center py-2">Loading leaderboard data...</div>
    {:else if userRankings.length === 0}
      <div class="text-center py-2">No data available</div>
    {:else}
      {#each userRankings as user, index}
        <div class="flex justify-between items-center p-2 bg-black/20 rounded">
          <div class="flex items-center gap-2">
            <span class="font-bold">{index + 1}.</span>
            <span class="font-mono">{formatAddress(user.address)}</span>
            {#if user.address === address}
              <span class="text-xs bg-primary/30 px-1 rounded">You</span>
            {/if}
          </div>
          <div class="font-bold">{formatValue(user.totalValue.toString())}</div>
        </div>
      {/each}
    {/if}
  </div>
</ScrollArea>
