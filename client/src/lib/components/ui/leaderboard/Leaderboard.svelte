<script lang="ts">
  import accountData from '$lib/account.svelte';
  import { onMount } from 'svelte';

  import { fetchTokenBalances, baseToken } from './request';
  import { useAvnu, type QuoteParams } from '$lib/utils/avnu.svelte';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';

  //Types
  import type { Token } from '$lib/interfaces';
  import type { Quote } from '@avnu/avnu-sdk';

  //UI
  import Card from '../../ui/card/card.svelte';
  import { ScrollArea } from '../../ui/scroll-area';

  //Helpers
  import { formatAddress, formatValue } from './helpers';

  const address = $derived(accountData.address);
  let leaderboardData = $state<Record<string, Record<string, number>>>({});
  let userRankings = $state<Array<{ address: string; totalValue: number }>>([]);
  let isLoading = $state(true);
  const avnu = useAvnu();

  let userRank = $state<number | null>(null);

  /**
   * @notice Creates a token object for Avnu quotes
   * @dev Used to format token data from our interfaces
   * @param tokenAddress The address of the token
   * @returns A Token object with default values
   */
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

  /**
   * @notice Calculates the price of a token amount in base currency (estark)
   * @dev Uses Avnu SDK to fetch quotes for price conversion
   * @param tokenAddress The address of the token to price
   * @param amount The amount of tokens to price
   * @returns The price in base currency as a number
   */
  async function getPriceInBaseCurrency(
    tokenAddress: string,
    amount: bigint,
  ): Promise<number> {
    if (!tokenAddress || !amount || amount <= 0n) {
      return 0;
    }

    try {
      const sellAmount = CurrencyAmount.fromUnscaled(amount.toString());
      const quoteParams: QuoteParams = {
        sellToken: createTokenObject(tokenAddress),
        buyToken: createTokenObject(baseToken),
        sellAmount,
      };

      let data: QuoteParams & {
        leadingSide: 'sell' | 'buy';
      } = {
        ...quoteParams,
        leadingSide: 'sell',
      };

      const quotes: Quote[] = await avnu.fetchQuotes(data);
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

  /**
   * @notice Calculates token prices for all unique tokens
   * @dev Creates a cache of token prices to avoid redundant API calls
   * @returns Record of token addresses to their prices
   */
  async function calculateTokenPrices(): Promise<Record<string, number>> {
    const uniqueTokens = new Set<string>();
    const tokenPriceCache: Record<string, number> = {};

    // Get unique tokens
    for (const tokens of Object.values(leaderboardData)) {
      for (const tokenAddress in tokens) {
        if (tokenAddress !== baseToken) {
          uniqueTokens.add(tokenAddress);
        }
      }
    }

    // Calculate prices for each token
    for (const tokenAddress of uniqueTokens) {
      try {
        const priceForOneUnit = await getPriceInBaseCurrency(
          tokenAddress,
          1000000000000000000n,
        );
        tokenPriceCache[tokenAddress] = priceForOneUnit;
      } catch (error) {
        console.error(`Failed to get price for token ${tokenAddress}:`, error);
        tokenPriceCache[tokenAddress] = 0;
      }
    }

    return tokenPriceCache;
  }

  /**
   * @notice Calculates total asset value for all users
   * @dev Uses cached token prices to calculate total value in base currency
   * @returns Array of user addresses and their total asset values, sorted by value
   */
  async function calculateUserAssets() {
    const userAssets: Array<{ address: string; totalValue: bigint }> = [];
    const tokenPriceCache = await calculateTokenPrices();

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

    return userAssets
      .map((user) => ({
        address: user.address,
        totalValue: Number(user.totalValue),
      }))
      .sort((a, b) => b.totalValue - a.totalValue);
  }

  /**
   * @notice Refreshes the leaderboard data
   * @dev Fetches new token balances and recalculates user rankings
   */
  async function refreshLeaderboard() {
    isLoading = true;
    try {
      leaderboardData = await fetchTokenBalances();
      userRankings = await calculateUserAssets();

      userRank = userRankings.findIndex((user) => user.address === address);
      if (userRank !== -1) {
        userRank += 1;
      } else {
        userRank = null;
      }
    } catch (error) {
      console.error('Error refreshing leaderboard:', error);
    } finally {
      isLoading = false;
    }
  }

  onMount(refreshLeaderboard);
</script>

<Card class="shadow-ponzi w-72">
  <div class="flex justify-between items-center mr-3 mb-2 text-white">
    <div class="text-2xl text-shadow-none">leaderboard</div>
    <button onclick={refreshLeaderboard} aria-label="Refresh balance">
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
          <div class="flex justify-between items-center p-2 rounded">
            <div class="flex items-center gap-2">
              <span class="font-bold">
                {index + 1}.
              </span>
              <span
                class="font-mono"
                class:text-red-500={user.address === address}
                >{formatAddress(user.address)}</span
              >
              {#if user.address === address}
                <span class="text-xs bg-primary/30 px-1 rounded">You</span>
              {/if}
              {#if index === 0}
                <img
                  src="/assets/extra/crown.png"
                  alt="Crown"
                  class="w-4 h-4"
                />
              {/if}
            </div>
            <div class="font-bold">
              {formatValue(user.totalValue.toString())}
            </div>
          </div>
        {/each}
      {/if}
    </div>
  </ScrollArea>

  {#if userRank !== null && !isLoading && address}
    <div class="mt-2 px-2 py-1 text-white border-t border-white/20">
      <div class="flex items-center gap-2">
        <span class="text-sm">Your rank:</span>
        <span class="font-bold">{userRank}</span>
        <span class="font-mono text-red-500 text-sm"
          >{formatAddress(address)}</span
        >
      </div>
    </div>
  {/if}
</Card>
