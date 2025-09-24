<script lang="ts">
  import Card from '$lib/components/ui/card/card.svelte';
  import type { Token } from '$lib/interfaces';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { getTokenMetadata } from '$lib/utils';
  import { onMount } from 'svelte';
  import { fetchBuyEvents } from './requests';

  let {
    tokens,
  }: {
    tokens: Token[];
  } = $props();

  let tokenTotals = $state<Record<string, bigint>>({});
  let tokenTransactions = $state<Record<string, number>>({});
  let isLoading = $state(true);

  /**
   * @notice Calculates total amount spent per token from buy events
   * @param events Array of buy events from the database
   */
  function calculateTokenTotals(events: any[]) {
    const totals: Record<string, bigint> = {};
    const transactions: Record<string, number> = {};

    for (const event of events) {
      const token = event.token_used;
      const amount = BigInt(event.sold_price);

      if (!totals[token]) {
        totals[token] = 0n;
        transactions[token] = 0;
      }
      totals[token] += amount;
      transactions[token] += 1;
    }

    return { totals, transactions };
  }

  async function refreshBuyInfo() {
    isLoading = true;
    try {
      const buyEvents = await fetchBuyEvents();
      const { totals, transactions } = calculateTokenTotals(buyEvents);
      tokenTotals = totals;
      tokenTransactions = transactions;
    } catch (error) {
      console.error('Error fetching buy events:', error);
    } finally {
      isLoading = false;
    }
  }

  onMount(refreshBuyInfo);
</script>

{#if isLoading}
  <div class="flex justify-center items-center p-8">
    <div class="text-white text-lg">Loading volume data...</div>
  </div>
{:else if Object.keys(tokenTotals).length === 0}
  <div class="flex justify-center items-center p-8">
    <div class="text-white text-lg">No data available</div>
  </div>
{:else}
  {#each Object.entries(tokenTotals) as [tokenAddress, total]}
    {@const tokenDetails = tokens.find((t) => t.address === tokenAddress)}
    {#if tokenDetails}
      {@const metadata = getTokenMetadata(tokenDetails.skin)}
      <Card class="shadow-ponzi overflow-hidden">
        <div class="p-4">
          <!-- Token Header -->
          <div class="flex items-center gap-3 mb-4">
            <div class="flex items-center">
              <img
                src={metadata?.icon || '/tokens/default/icon.png'}
                alt={tokenDetails.symbol}
                class="w-8 h-8 rounded-full border-2 border-gray-800"
              />
            </div>
            <h3 class="text-lg font-bold text-white">
              {tokenDetails.symbol} Volume
            </h3>
          </div>

          <!-- Volume Info -->
          <div class="bg-black/20 rounded-lg p-3 mb-3">
            <div class="flex justify-between items-center mb-2">
              <span class="text-gray-300">Total Volume:</span>
              <span class="text-white font-mono font-bold">
                {CurrencyAmount.fromUnscaled(total, tokenDetails).toString()}
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-300">Total Transactions:</span>
              <span class="text-white font-mono font-bold">
                {tokenTransactions[tokenAddress]}
              </span>
            </div>
          </div>

          <!-- Token Details -->
          <div class=" text-gray-300">
            <div class="flex justify-between items-center mb-1">
              <span>Token Address:</span>
              <span class="font-mono"
                >{tokenAddress.slice(0, 6)}...{tokenAddress.slice(-4)}</span
              >
            </div>
            <div class="flex justify-between items-center">
              <span>Token Name:</span>
              <span>{tokenDetails.name}</span>
            </div>
          </div>
        </div>
      </Card>
    {/if}
  {/each}
{/if}
