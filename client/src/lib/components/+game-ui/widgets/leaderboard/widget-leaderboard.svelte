<script lang="ts">
  import { onMount } from 'svelte';
  import type { Snippet } from 'svelte';
  import { RefreshCw } from 'lucide-svelte';
  import RotatingCoin from '$lib/components/loading-screen/rotating-coin.svelte';
  import TournamentLeaderboard from '../tournament/tournament-leaderboard.svelte';
  import Button from '$lib/components/ui/button/button.svelte';
  import {
    fetchLeaderboard,
    sortEntriesByRankingMode,
    type LeaderboardEntry,
    type RankingMode,
  } from './leaderboard.service';

  const MAX_ITEMS = 100;

  type Props = {
    setCustomTitle?: (title: Snippet<[]> | null) => void;
    setCustomControls?: (controls: Snippet<[]> | null) => void;
  };

  let { setCustomControls }: Props = $props();

  let entries = $state<LeaderboardEntry[]>([]);
  let refreshInterval: NodeJS.Timeout;
  let isRefreshing = $state(false);
  let isInitialLoad = $state(true);
  let rankingMode = $state<RankingMode>('best');

  // Sort entries by ranking mode using PnL metrics
  const sortedEntries = $derived(
    sortEntriesByRankingMode(entries, rankingMode, 'pnl'),
  );

  async function refresh() {
    if (isRefreshing) return;
    isRefreshing = true;

    try {
      const data = await fetchLeaderboard();
      entries = data.entries;
      isInitialLoad = false;
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      isRefreshing = false;
    }
  }

  onMount(() => {
    refresh();

    // Refresh leaderboard every 60 seconds
    refreshInterval = setInterval(refresh, 60000);

    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  });

  // Set up custom controls with refresh button
  $effect(() => {
    if (setCustomControls) {
      setCustomControls(refreshControls);
    }
  });
</script>

<div class="flex flex-col h-full min-h-0">
  <!-- Tab buttons -->
  <div class="flex border-b border-gray-700">
    <Button
      class="flex-1 py-2 text-sm font-medium transition-colors {rankingMode ===
      'best'
        ? 'bg-purple-600 text-white'
        : 'bg-gray-800 text-gray-400 hover:text-white'}"
      onclick={() => (rankingMode = 'best')}
    >
      Best Position
    </Button>
    <Button
      class="flex-1 py-2 text-sm font-medium transition-colors {rankingMode ===
      'total'
        ? 'bg-purple-600 text-white'
        : 'bg-gray-800 text-gray-400 hover:text-white'}"
      onclick={() => (rankingMode = 'total')}
    >
      Best PnL
    </Button>
  </div>

  <!-- Content -->
  <div class="flex-1 overflow-auto min-h-0">
    {#if isInitialLoad}
      <div
        class="text-center py-8 text-gray-400 flex flex-col items-center gap-4"
      >
        <RotatingCoin />
        <span>Loading leaderboard data...</span>
      </div>
    {:else if entries.length === 0}
      <div class="text-center py-8 text-gray-400">No positions yet</div>
    {:else}
      <TournamentLeaderboard
        entries={sortedEntries}
        {rankingMode}
        limit={MAX_ITEMS}
        showFullDetails={true}
        metricType="pnl"
      />
    {/if}
  </div>
</div>

{#snippet refreshControls()}
  {#if isRefreshing}
    <div class="w-6 h-6 flex items-center justify-center">
      <RotatingCoin />
    </div>
  {:else}
    <button
      class="window-control"
      onclick={refresh}
      aria-label="Refresh leaderboard"
      title="Refresh leaderboard"
    >
      <RefreshCw size={16} />
    </button>
  {/if}
{/snippet}
