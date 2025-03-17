<script lang="ts">
  import { onMount } from 'svelte';
  import type { Token } from '$lib/interfaces';
  import type { EkuboApiResponse, TokenTVL, TokenVolume } from './requests';
  import { fetchEkuboPairData } from './requests';
  import Card from '$lib/components/ui/card/card.svelte';

  // Base token (e.g. eStark)
  const baseToken: string =
    '0x071de745c1ae996cfd39fb292b4342b7c086622e3ecf3a5692bd623060ff3fa0';

  // Tokens passed as props.
  export let tokens: Token[];

  // Find base token details
  const baseTokenDetails = tokens.find((t) => t.address === baseToken);

  interface HistoricalPrice {
    date: string;
    price: number;
  }

  interface PairCardData {
    token: string;
    tokenDetails: Token;
    data: EkuboApiResponse;
    currentRate: number;
    historicalRate: number;
    historicalDate: string;
    volumeByToken: TokenVolume[];
    topPools: any[];
    historicalPrices: HistoricalPrice[];
  }

  let pairCards: PairCardData[] = [];
  let loading = true;
  let error = '';

  /**
   * @notice Calculates the current conversion rate between two tokens in a pool
   * @dev Uses the TVL data to determine the exchange rate between token0 and token1
   * @param data The Ekubo API response containing TVL information
   * @returns The current conversion rate as a number
   */
  function calculateCurrentConversionRate(data: EkuboApiResponse): number {
    if (data.tvlByToken.length < 2) return 0;
    const token0 = data.tvlByToken[0];
    const token1 = data.tvlByToken[1];
    const balance0 = BigInt(token0.balance);
    const balance1 = BigInt(token1.balance);
    return Number(balance0) / Number(balance1);
  }

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
    const balance0 = historicalBalances[tokens[0]];
    const balance1 = historicalBalances[tokens[1]];
    return Number(balance0) / Number(balance1);
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
    const pairTokens = tokens.filter((t) => t.address !== baseToken);
    try {
      const promises = pairTokens.map(async (token) => {
        const data = await fetchEkuboPairData(baseToken, token.address);
        const currentRate = calculateCurrentConversionRate(data);
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

  onMount(() => {
    loadPairData();
  });
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
        <Card class="shadow-ponzi overflow-hidden">
          <div class="p-4">
            <!-- Pair Header -->
            <div class="flex items-center gap-3 mb-4">
              <div class="flex items-center -space-x-2">
                <img
                  src={baseTokenDetails?.images.icon}
                  alt={baseTokenDetails?.symbol}
                  class="w-8 h-8 rounded-full border-2 border-gray-800 z-10"
                />
                <img
                  src={card.tokenDetails.images.icon}
                  alt={card.tokenDetails.symbol}
                  class="w-8 h-8 rounded-full border-2 border-gray-800"
                />
              </div>
              <h3 class="text-lg font-bold text-white">
                {baseTokenDetails?.symbol || 'Base'} / {card.tokenDetails
                  .symbol}
              </h3>
            </div>

            <!-- Conversion Rates -->
            <div class="bg-black/20 rounded-lg p-3 mb-3">
              <div class="flex justify-between items-center mb-2">
                <span class="text-gray-300">Current Rate:</span>
                <span class="text-white font-mono font-bold"
                  >{card.currentRate.toFixed(6)}</span
                >
              </div>
              <div class="flex justify-between items-center text-sm">
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
                  <div class="flex justify-between text-sm">
                    <span class="text-gray-300">
                      {vol.token === baseToken
                        ? baseTokenDetails?.symbol
                        : card.tokenDetails.symbol}:
                    </span>
                    <div class="text-right">
                      <div class="text-white font-mono">
                        {Number(vol.volume).toLocaleString()}
                      </div>
                      <div class="text-xs text-gray-400">
                        Fees: {Number(vol.fees).toLocaleString()}
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            </div>

            <!-- Top Pools -->
            <div class="mb-3">
              <h4 class="text-white font-semibold mb-2">Top Pools</h4>
              <div class="bg-black/20 rounded-lg p-3 space-y-2">
                {#each card.topPools as pool}
                  <div class="text-sm">
                    <div class="flex justify-between mb-1">
                      <span class="text-gray-300">Fee:</span>
                      <span class="text-white font-mono">{pool.fee}%</span>
                    </div>
                    <div class="flex justify-between text-xs">
                      <span class="text-gray-400">TVL:</span>
                      <span class="text-gray-300 font-mono">
                        {Number(pool.tvl0_total).toLocaleString()} / {Number(
                          pool.tvl1_total,
                        ).toLocaleString()}
                      </span>
                    </div>
                  </div>
                {/each}
              </div>
            </div>

            <!-- Historical Prices Collapsible -->
            <details class="group">
              <summary
                class="flex justify-between items-center cursor-pointer text-white font-semibold"
              >
                <span>Historical Prices</span>
                <svg
                  class="w-5 h-5 transform group-open:rotate-180 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </summary>
              <div
                class="mt-2 bg-black/20 rounded-lg p-3 max-h-40 overflow-y-auto"
              >
                <table class="w-full text-sm">
                  <thead>
                    <tr>
                      <th class="text-left text-gray-300">Date</th>
                      <th class="text-right text-gray-300">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each card.historicalPrices as hp}
                      <tr>
                        <td class="text-gray-400"
                          >{new Date(hp.date).toLocaleDateString()}</td
                        >
                        <td class="text-right font-mono text-white"
                          >{hp.price.toFixed(6)}</td
                        >
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </details>
          </div>
        </Card>
      {/each}
    </div>
  </div>
{/if}

<style>
</style>
