<script lang="ts">
  import { fetchAllTimePlayers } from './requests';
  import { onMount } from 'svelte';
  import Card from '../ui/card/card.svelte';

  const WHITE_LIST_COUNT = 53;

  let playerCount = $state(0);
  let isLoading = $state(true);
  let activeAddresses = $state<Array<{ address: string; activatedAt: string }>>(
    [],
  );

  $effect(() => {
    console.log('Active addresses:', activeAddresses);
  });

  async function refreshPlayerInfo() {
    isLoading = true;
    try {
      const players = await fetchAllTimePlayers();
      playerCount = players.length;
      activeAddresses = players.map(
        (player: { address: string; internal_executed_at: string }) => ({
          address: player.address,
          activatedAt: player.internal_executed_at,
        }),
      );
    } catch (error) {
      console.error('Error fetching players:', error);
    } finally {
      isLoading = false;
    }
  }

  onMount(refreshPlayerInfo);
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
{/if}
