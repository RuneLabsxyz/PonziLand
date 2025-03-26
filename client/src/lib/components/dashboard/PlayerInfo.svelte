<script lang="ts">
  import { fetchAllTimePlayers, fetchBuyEvents } from './requests';
  import { onMount } from 'svelte';
  import Card from '../ui/card/card.svelte';
  import TransactionChart from './TransactionChart.svelte';

  const WHITE_LIST_COUNT = 53;

  let playerCount = $state(0);
  let isLoading = $state(true);
  let activeAddresses = $state<
    Array<{
      address: string;
      actions: Array<{ date: string; type: 'first_play' | 'buy' }>;
    }>
  >([]);
  let buys = $state<Array<{ buyer: string; internal_executed_at: string }>>([]);

  $effect(() => {
    console.log('Active addresses:', activeAddresses);
  });

  async function refreshPlayerInfo() {
    isLoading = true;
    try {
      const [players, buyEvents] = await Promise.all([
        fetchAllTimePlayers(),
        fetchBuyEvents(),
      ]);

      playerCount = players.length;
      buys = buyEvents;

      const addressActions = new Map();

      players.forEach(
        (player: { address: string; internal_executed_at: string }) => {
          addressActions.set(player.address, [
            {
              date: player.internal_executed_at,
              type: 'first_play',
            },
          ]);
        },
      );

      // Add buy actions
      buyEvents.forEach(
        (buy: { buyer: string; internal_executed_at: string }) => {
          const actions = addressActions.get(buy.buyer) || [];
          actions.push({
            date: buy.internal_executed_at,
            type: 'buy',
          });
          addressActions.set(buy.buyer, actions);
        },
      );

      // Convert map to array and sort actions by date
      activeAddresses = Array.from(addressActions.entries()).map(
        ([address, actions]) => ({
          address,
          actions: actions.sort(
            (
              a: { date: string; type: 'first_play' | 'buy' },
              b: { date: string; type: 'first_play' | 'buy' },
            ) => new Date(a.date).getTime() - new Date(b.date).getTime(),
          ),
        }),
      );
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      isLoading = false;
    }
  }

  function calculateChurnRate(days: number): string {
    const churnedPlayers = activeAddresses.filter((player) => {
      if (player.actions.length === 1) return true; // Only one action means they churned

      const firstAction = new Date(player.actions[0].date);
      const lastAction = new Date(
        player.actions[player.actions.length - 1].date,
      );

      const hoursDiff =
        (lastAction.getTime() - firstAction.getTime()) / (1000 * 60 * 60);
      return hoursDiff < 24 * days;
    }).length;

    const churnRate = (churnedPlayers / activeAddresses.length) * 100;
    return churnRate.toFixed(1);
  }

  function calculateTransactionStats() {
    const txCountByAddress = new Map();
    buys.forEach((buy) => {
      txCountByAddress.set(
        buy.buyer,
        (txCountByAddress.get(buy.buyer) || 0) + 1,
      );
    });

    const txCounts = Array.from(txCountByAddress.values());
    txCounts.sort((a, b) => a - b);

    const average =
      txCounts.reduce((sum, count) => sum + count, 0) / txCounts.length;

    const q1Index = Math.floor(txCounts.length * 0.25);
    const q2Index = Math.floor(txCounts.length * 0.5);
    const q3Index = Math.floor(txCounts.length * 0.75);

    return {
      average: average.toFixed(2),
      median: txCounts[q2Index],
      q1: txCounts[q1Index],
      q2: txCounts[q2Index],
      q3: txCounts[q3Index],
      min: txCounts[0],
      max: txCounts[txCounts.length - 1],
    };
  }

  onMount(async () => {
    await refreshPlayerInfo();
  });
</script>

{#if isLoading}
  <div class="flex justify-center items-center p-8">
    <div class="text-white text-lg">Loading player data...</div>
  </div>
{:else}
  <Card class="shadow-ponzi overflow-hidden">
    <div class="p-4">
      <!-- Header -->
      <div class="flex items-center gap-3 mb-4">
        <h3 class="text-lg font-bold text-white">Total Players</h3>
      </div>

      <!-- Player Count Info -->
      <div class="bg-black/20 rounded-lg p-3">
        <div class="flex justify-between items-center mb-2">
          <span class="text-gray-300">All-Time Players:</span>
          <span class="text-white font-mono font-bold">{playerCount}</span>
        </div>
        <div class="flex justify-between items-center mb-2">
          <span class="text-gray-300">Whitelist Spots:</span>
          <span class="text-white font-mono font-bold">{WHITE_LIST_COUNT}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-gray-300">Whitelist conversion rate:</span>
          <span class="text-white font-mono font-bold">
            {((playerCount / WHITE_LIST_COUNT) * 100).toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  </Card>

  <Card class="shadow-ponzi overflow-hidden">
    <div class="p-4">
      <!-- Header -->
      <div class="flex items-center gap-3 mb-4">
        <h3 class="text-lg font-bold text-white">Player Retention</h3>
      </div>

      <!-- Churn Rate Info -->
      <div class="bg-black/20 rounded-lg p-3">
        <div class="flex justify-between items-center mb-2">
          <span class="text-gray-300">Day 1 Churn Rate:</span>
          <span class="text-white font-mono font-bold">
            {calculateChurnRate(1)}%
          </span>
        </div>
        <div class="flex justify-between items-center mb-2">
          <span class="text-gray-300">Day 2 Churn Rate:</span>
          <span class="text-white font-mono font-bold">
            {calculateChurnRate(2)}%
          </span>
        </div>
        <div class="flex justify-between items-center mb-2">
          <span class="text-gray-300">Day 3 Churn Rate:</span>
          <span class="text-white font-mono font-bold">
            {calculateChurnRate(3)}%
          </span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-gray-300">Day 4 Churn Rate:</span>
          <span class="text-white font-mono font-bold">
            {calculateChurnRate(4)}%
          </span>
        </div>
      </div>
    </div>
  </Card>

  <Card class="shadow-ponzi overflow-hidden">
    <div class="p-4">
      <div class="flex items-center gap-3 mb-4">
        <h3 class="text-lg font-bold text-white">Transaction Activity</h3>
      </div>

      <TransactionChart
        transactions={buys.map((buy) => ({
          date: buy.internal_executed_at,
        }))}
      />
    </div>
  </Card>

  <Card class="shadow-ponzi overflow-hidden">
    <div class="p-4">
      <!-- Header -->
      <div class="flex items-center gap-3 mb-4">
        <h3 class="text-lg font-bold text-white">Transaction Statistics</h3>
      </div>

      <!-- Stats Info -->
      <div class="bg-black/20 rounded-lg p-3">
        <div class="flex justify-between items-center mb-2">
          <span class="text-gray-300">Average Transactions/Player:</span>
          <span class="text-white font-mono font-bold">
            {calculateTransactionStats().average}
          </span>
        </div>
        <div class="flex justify-between items-center mb-2">
          <span class="text-gray-300">Median (Q2):</span>
          <span class="text-white font-mono font-bold">
            {calculateTransactionStats().median}
          </span>
        </div>
        <div class="flex justify-between items-center mb-2">
          <span class="text-gray-300">Q1 (25th percentile):</span>
          <span class="text-white font-mono font-bold">
            {calculateTransactionStats().q1}
          </span>
        </div>
        <div class="flex justify-between items-center mb-2">
          <span class="text-gray-300">Q3 (75th percentile):</span>
          <span class="text-white font-mono font-bold">
            {calculateTransactionStats().q3}
          </span>
        </div>
        <div class="flex justify-between items-center mb-2">
          <span class="text-gray-300">Min Transactions:</span>
          <span class="text-white font-mono font-bold">
            {calculateTransactionStats().min}
          </span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-gray-300">Max Transactions:</span>
          <span class="text-white font-mono font-bold">
            {calculateTransactionStats().max}
          </span>
        </div>
      </div>
    </div>
  </Card>
{/if}
