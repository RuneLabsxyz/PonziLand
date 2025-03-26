<script lang="ts">
  import { fetchAllTimePlayers, fetchBuyEvents } from './requests';
  import { onMount } from 'svelte';
  import Card from '../ui/card/card.svelte';

  const WHITE_LIST_COUNT = 53;

  let playerCount = $state(0);
  let isLoading = $state(true);
  let activeAddresses = $state<
    Array<{
      address: string;
      actions: Array<{ date: string; type: 'first_play' | 'buy' }>;
    }>
  >([]);

  $effect(() => {
    console.log('Active addresses:', activeAddresses);
  });

  async function refreshPlayerInfo() {
    isLoading = true;
    try {
      const [players, buys] = await Promise.all([
        fetchAllTimePlayers(),
        fetchBuyEvents(),
      ]);

      playerCount = players.length;

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
      buys.forEach((buy: { buyer: string; internal_executed_at: string }) => {
        const actions = addressActions.get(buy.buyer) || [];
        actions.push({
          date: buy.internal_executed_at,
          type: 'buy',
        });
        addressActions.set(buy.buyer, actions);
      });

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
{/if}
