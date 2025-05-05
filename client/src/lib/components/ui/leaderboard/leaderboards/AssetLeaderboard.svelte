<script lang="ts">
  import {
    getTokenPrices,
    type TokenPrice,
  } from '$lib/components/defi/ekubo/requests';
  import { usernamesStore } from '$lib/stores/account.svelte';
  import { padAddress } from '$lib/utils';
  import { AI_AGENT_ADDRESS } from '$lib/const';
  import { ScrollArea } from '$lib/components/ui/scroll-area';
  import { formatAddress, formatValue } from '../helpers';
  import { onMount } from 'svelte';
  import { fetchTokenBalances } from '../request';
  import data from '$profileData';

  const BASE_TOKEN = data.mainCurrencyAddress;

  let { leaderboardSize = 0, address } = $props();

  const VERIFIED_ONLY = true;

  let leaderboardData = $state<Record<string, Record<string, number>>>({});
  let tokenPrices = $state<TokenPrice[]>([]);
  let isLoading = $state(true);
  let userRankings = $state<Array<{ address: string; totalValue: number }>>([]);
  let userRank = $state<number | null>(null);

  /**
   * @notice Calculates token prices for all unique tokens
   * @dev Creates a cache of token prices from the API
   * @returns Record of token addresses to their price ratios
   */
  async function calculateTokenPrices(): Promise<Record<string, number>> {
    const tokenPriceCache: Record<string, number> = {};
    try {
      tokenPrices = await getTokenPrices();
      // Create a cache of token prices

      for (const tokenPrice of tokenPrices) {
        tokenPriceCache[padAddress(tokenPrice.address)!] = tokenPrice.ratio;
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
    const userAssets: Array<{ address: string; totalValue: number }> = [];
    const tokenPriceCache = await calculateTokenPrices();

    for (const [accountAddress, tokens] of Object.entries(leaderboardData)) {
      if (padAddress(accountAddress) === AI_AGENT_ADDRESS) {
        continue;
      }

      let totalValue = 0;

      for (const [rawTokenAddress, balanceStr] of Object.entries(tokens)) {
        const balance = Number(balanceStr);
        const tokenAddress = padAddress(rawTokenAddress)!;
        if (tokenAddress === BASE_TOKEN) {
          // For base token (eSTRK), add directly to total
          totalValue += Number(balance / 10 ** 18);
        } else if (tokenPriceCache[tokenAddress]) {
          // For other tokens, convert to base token value using ratio
          const tokenPrice = tokenPriceCache[tokenAddress];
          totalValue += Number(balance / 10 ** 18) / tokenPrice;
        }
      }

      userAssets.push({
        address: accountAddress,
        totalValue,
      });
    }

    return userAssets.sort((a, b) => b.totalValue - a.totalValue);
  }

  onMount(async () => {
    isLoading = true;
    try {
      leaderboardData = await fetchTokenBalances();
      userRankings = await calculateUserAssets();

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
      console.error('Error fetching leaderboard data:', error);
    } finally {
      isLoading = false;
    }
  });
</script>

<ScrollArea
  class={`${leaderboardSize === 1 ? 'h-96' : 'h-32'} w-full text-white`}
>
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
            {Math.floor(user.totalValue)}
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
