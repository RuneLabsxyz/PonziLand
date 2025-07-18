<script lang="ts">
  import Card from '$lib/components/ui/card/card.svelte';
  import type { Token } from '$lib/interfaces';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import data from '$profileData';
  import { onMount } from 'svelte';
  import type { EkuboApiResponse } from '../../api/defi/ekubo/requests';
  import {
    calculatePriceFromPool,
    fetchEkuboPairData,
    getTokenPrices,
    type TokenPrice,
  } from '../../api/defi/ekubo/requests';
  import Leaderboard from '../+game-ui/widgets/leaderboard/Leaderboard.svelte';
  import BuyInfo from './buyInfo.svelte';
  import PlayerInfo from './PlayerInfo.svelte';
  import PriceChart from './PriceChart.svelte';
  import type { TokenVolume } from './requests';
  import { mainnet } from '@reown/appkit/networks';
  import { baseToken } from '$lib/stores/tokens.store.svelte';
  import { BASE_URL } from '@avnu/avnu-sdk';

  const BASE_TOKEN = data.mainCurrencyAddress;
  const BASE_TOKEN_NUMERIC = BigInt(BASE_TOKEN).toString(10);

  let {
    tokens,
  }: {
    tokens: Token[];
  } = $props();

  // Find base token details
  const baseTokenDetails = tokens.find((t) => t.address === BASE_TOKEN)!;

  let tokenRates = $state<{ token: string; rate: number }[]>([]);
  interface HistoricalPrice {
    date: string;
    price: number;
  }

  interface PairCardData {
    token: string;
    tokenDetails: Token;
    data: EkuboApiResponse;
    currentRate: CurrencyAmount;
    historicalRate: number;
    historicalDate: string;
    volumeByToken: TokenVolume[];
    topPools: any[];
    historicalPrices: HistoricalPrice[];
  }

  let pairCards: PairCardData[] = $state([]);
  let loading = $state(true);
  let error = $state('');
  let tokenPrices: TokenPrice[] = $state([]);

  /**
   * @notice Retrieves historical token balances for a specific date
   * @dev Applies delta values to current balances to calculate historical balances
   * @param data The Ekubo API response containing TVL and delta information
   * @param targetDate The target date for historical balances
   * @returns An object mapping token addresses to their historical balances
   */
  function getHistoricalBalances(
    data: EkuboApiResponse,
    targetDate: string,
  ): { [token: string]: bigint } {
    const target = new Date(targetDate);
    const balances: { [token: string]: bigint } = {};
    for (const tvl of data.tvlByToken) {
      balances[tvl.token] = BigInt(tvl.balance);
    }
    for (const deltaEntry of data.tvlDeltaByTokenByDate) {
      const entryDate = new Date(deltaEntry.date);
      if (entryDate >= target) {
        const deltaValue = BigInt(deltaEntry.delta);
        balances[deltaEntry.token] = balances[deltaEntry.token] - deltaValue;
      }
    }
    return balances;
  }

  /**
   * @notice Calculates the historical conversion rate between two tokens
   * @dev Uses historical balances to determine the exchange rate at a specific date
   * @param data The Ekubo API response containing TVL and delta information
   * @param targetDate The target date for the historical rate calculation
   * @returns The historical conversion rate as a number
   */
  function calculateHistoricalConversionRate(
    data: EkuboApiResponse,
    targetDate: string,
  ): number {
    const historicalBalances = getHistoricalBalances(data, targetDate);
    const tokens = Object.keys(historicalBalances);
    if (tokens.length < 2) return 0;

    const mainTokenIndex = tokens.indexOf(BASE_TOKEN_NUMERIC);
    const otherTokenIndex = mainTokenIndex === 0 ? 1 : 0;

    const balance0 = historicalBalances[tokens[mainTokenIndex]];
    const balance1 = historicalBalances[tokens[otherTokenIndex]];
    return Number(balance1) / Number(balance0);
  }

  /**
   * @notice Generates a complete history of token prices
   * @dev Calculates conversion rates for all available dates in the data
   * @param data The Ekubo API response containing TVL and delta information
   * @returns An array of objects containing dates and corresponding prices
   */
  function getAllHistoricalPrices(data: EkuboApiResponse): HistoricalPrice[] {
    const datesSet = new Set<string>();
    for (const entry of data.tvlDeltaByTokenByDate) {
      datesSet.add(entry.date);
    }
    const dates = Array.from(datesSet).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime(),
    );
    return dates.map((date) => {
      const price = calculateHistoricalConversionRate(data, date);
      return { date, price };
    });
  }

  /**
   * @notice Loads pair data for all tokens against the base token
   * @dev Fetches data from Ekubo API and processes it for display
   * @returns Promise that resolves when all pair data is loaded
   */
  async function loadPairData() {
    const pairTokens = tokens.filter((t) => t.address !== BASE_TOKEN);
    try {
      const promises = pairTokens.map(async (token) => {
        const data = await fetchEkuboPairData(BASE_TOKEN, token.address);

        let currentRate = calculatePriceFromPool(
          data.topPools[0],
          baseTokenDetails.decimals,
          token.decimals,
        );

        const historicalDate = data.tvlDeltaByTokenByDate.length
          ? data.tvlDeltaByTokenByDate[0].date
          : new Date().toISOString();
        const historicalRate = calculateHistoricalConversionRate(
          data,
          historicalDate,
        );
        const historicalPrices = getAllHistoricalPrices(data);
        return {
          token: token.address,
          tokenDetails: token,
          data,
          currentRate,
          historicalRate,
          historicalDate,
          volumeByToken: data.volumeByToken,
          topPools: data.topPools,
          historicalPrices,
        } as PairCardData;
      });
      pairCards = await Promise.all(promises);
    } catch (err) {
      console.error(err);
      error = 'Error loading pair data';
    } finally {
      loading = false;
    }
  }

  async function getPrices() {
    return getTokenPrices().then((prices) => {
      tokenPrices = prices;
      tokenRates = prices.map((price) => ({
        token: price.address,
        rate: 1 / price.ratio,
      }));
      return prices;
    });
  }

  onMount(async () => {
    await getPrices();
    await loadPairData();
    scrollToHash();
  });

  function scrollToHash() {
    const hash = window.location.hash;
    if (hash) {
      const element = document.querySelector(hash);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }
</script>

{#if loading}
  <div class="flex justify-center items-center p-8">
    <div class="text-white text-lg">Loading pair data...</div>
  </div>
{:else if error}
  <div class="flex justify-center items-center p-8">
    <div class="text-red-500 text-lg">{error}</div>
  </div>
{:else}
  <div class="container mx-auto p-4">
    <h1 class="text-2xl mb-4 text-white">Token Pairs</h1>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each pairCards as card}
        <Card
          class="shadow-ponzi overflow-hidden"
          id={card.tokenDetails.symbol}
        >
          <div class="p-4">
            <!-- Pair Header -->
            <div class="flex items-center gap-3 mb-4">
              <div class="flex items-center -space-x-2">
                <img
                  src={card.tokenDetails.images.icon}
                  alt={card.tokenDetails.symbol}
                  class="w-8 h-8 rounded-full border-2 border-gray-800 z-10"
                />
                <img
                  src={baseTokenDetails?.images.icon}
                  alt={baseTokenDetails?.symbol}
                  class="w-8 h-8 rounded-full border-2 border-gray-800"
                />
              </div>
              <h3 class="text-lg font-bold text-white">
                {card.tokenDetails.symbol} / {baseTokenDetails?.symbol ||
                  'Base'}
              </h3>
            </div>

            <!-- Price Chart -->
            <div class="mb-4">
              <PriceChart
                data={card.historicalPrices}
                title="Price History"
                baseSymbol={baseTokenDetails?.symbol || 'Base'}
                quoteSymbol={card.tokenDetails.symbol}
              />
            </div>

            <!-- Conversion Rates -->
            <div class="bg-black/20 rounded-lg p-3 mb-3">
              <div class="flex justify-between items-center mb-2">
                <span class="text-gray-300">Current Rate:</span>
                <span class="text-white font-mono font-bold">
                  {tokenRates
                    .find((rate) => rate.token === card.token)
                    ?.rate.toFixed(2) ?? 'N/A'}
                </span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-300"
                  >Historical ({new Date(
                    card.historicalDate,
                  ).toLocaleDateString()}):</span
                >
                <span class="text-white font-mono"
                  >{card.historicalRate.toFixed(6)}</span
                >
              </div>
            </div>

            <!-- Volume Info -->
            <div class="mb-3">
              <h4 class="text-white font-semibold mb-2">Volume</h4>
              <div class="bg-black/20 rounded-lg p-3 space-y-2">
                {#each card.volumeByToken as vol}
                  <div class="flex justify-between">
                    <span class="text-BASE_TOKEN-300">
                      {vol.token === BASE_TOKEN
                        ? baseTokenDetails?.symbol
                        : card.tokenDetails.symbol}:
                    </span>
                    <div class="text-right">
                      <div class="text-white font-mono">
                        {CurrencyAmount.fromUnscaled(
                          vol.volume,
                          vol.token === BASE_TOKEN
                            ? baseTokenDetails
                            : card.tokenDetails,
                        ).toString()}
                      </div>
                      <div class=" text-gray-400">
                        Fees: {CurrencyAmount.fromUnscaled(
                          vol.fees,
                          vol.token === BASE_TOKEN
                            ? baseTokenDetails
                            : card.tokenDetails,
                        ).toString()}
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          </div>
        </Card>
      {/each}

      <div class="col-span-full">
        <hr class="border-gray-700 my-8" />
        <h2 class="text-2xl mb-6 text-white">
          Token Volume Based on Land Purchases
        </h2>
      </div>

      <BuyInfo {tokens} />

      <div class="col-span-full">
        <hr class="border-gray-700 my-8" />
        <h2 class="text-2xl mb-6 text-white">Player data</h2>
      </div>

      <PlayerInfo />

      <div class="col-span-full">
        <hr class="border-gray-700 my-8" />
        <h2 class="text-2xl mb-6 text-white">Leaderboard</h2>
      </div>

      <div class="col-span-full">
        <Card class="shadow-ponzi w-72">
          <Leaderboard leaderboardSize={1} />
        </Card>
      </div>
    </div>
  </div>
{/if}

<style>
</style>
