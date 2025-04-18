<script lang="ts">
  import accountData from '$lib/account.svelte';
  import { onMount } from 'svelte';

  import {
    fetchTokenBalances,
    baseToken,
    fetchUsernamesBatch,
  } from './request';
  import { useAvnu, type SwapPriceParams } from '$lib/utils/avnu.svelte';
  import {
    getTokenPrices,
    type TokenPrice,
  } from '$lib/components/defi/ekubo/requests';
  //Types
  import type { Token } from '$lib/interfaces';

  //UI
  import Card from '../../ui/card/card.svelte';
  import { ScrollArea } from '../../ui/scroll-area';

  //Helpers
  import { formatAddress, formatValue } from './helpers';

  import { usernamesStore } from '$lib/stores/account.svelte';
  import { padAddress } from '$lib/utils';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';

  const address = $derived(accountData.address);
  let leaderboardData = $state<Record<string, Record<string, number>>>({});
  let userRankings = $state<Array<{ address: string; totalValue: number }>>([]);
  let isLoading = $state(true);
  let tokenPrices = $state<TokenPrice[]>([]);

  const VERIFIED_ONLY = true;

  let userRank = $state<number | null>(null);

  /**
   * @notice Calculates the price of a token amount in base currency (estark)
   * @dev Uses API to fetch token prices
   * @param tokenAddress The address of the token to price
   * @returns The price in base currency as a CurrencyAmount
   */
  function getPriceInBaseCurrency(tokenAddress: string): CurrencyAmount {
    if (!tokenAddress) {
      throw new Error('Invalid token address');
    }
    const tokenPrice = tokenPrices.find((tp) => tp.address === tokenAddress);

    if (tokenPrice) {
      return CurrencyAmount.fromUnscaled(tokenPrice.ratio);
    }
    return CurrencyAmount.fromScaled(0);
  }

  /**
   * @notice Calculates token prices for all unique tokens
   * @dev Creates a cache of token prices from the API
   * @returns Record of token addresses to their CurrencyAmount prices
   */
  async function calculateTokenPrices(): Promise<
    Record<string, CurrencyAmount>
  > {
    const tokenPriceCache: Record<string, CurrencyAmount> = {};
    try {
      tokenPrices = await getTokenPrices();

      // Create a cache of token prices
      for (const tokenPrice of tokenPrices) {
        tokenPriceCache[tokenPrice.address] = CurrencyAmount.fromUnscaled(
          tokenPrice.ratio,
        );
      }
    } catch (error) {
      console.error('Failed to fetch token prices from API:', error);
      tokenPrices = [];
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
          const tokenPrice = tokenPriceCache[tokenAddress];
          const balanceAmount = CurrencyAmount.fromUnscaled(balance);
          const valueInBase = balanceAmount
            .rawValue()
            .multipliedBy(tokenPrice.rawValue());
          totalInBaseCurrency +=
            BigInt(Math.floor(Number(valueInBase))) / 1000000000000000000n;
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
   * @notice Fetches usernames for all addresses in the rankings
   * @dev Uses batch request to get usernames efficiently
   */
  async function fetchUsernames() {
    try {
      const addresses = userRankings.map((user) => user.address);
      const fetchedUsernames = await fetchUsernamesBatch(addresses);
      usernamesStore.updateUsernames(fetchedUsernames);
    } catch (error) {
      console.error('Error fetching usernames:', error);
    }
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

      await fetchUsernames();

      if (VERIFIED_ONLY) {
        userRankings = userRankings.filter(
          (user) => padAddress(user.address)! in usernamesStore.getUsernames(),
        );
      }

      userRank = userRankings.findIndex(
        (user) => padAddress(user.address) === padAddress(address ?? ''),
      );
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
                >{usernamesStore.getUsernames()[padAddress(user.address)!] ||
                  formatAddress(user.address)}</span
              >
              {#if user.address === address}
                <span class="text-xs bg-primary/30 px-1 rounded">You</span>
              {/if}
              {#if index === 0}
                <img src="/extra/crown.png" alt="Crown" class="w-4 h-4" />
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
          >{usernamesStore.getUsernames()[address] ||
            formatAddress(address)}</span
        >
        <span class="ml-auto font-bold">
          {formatValue(
            userRankings
              .find((user) => user.address === address)
              ?.totalValue.toString() || '0',
          )}
        </span>
      </div>
    </div>
  {/if}
</Card>
