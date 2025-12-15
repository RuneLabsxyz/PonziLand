<script lang="ts">
  import { onMount } from 'svelte';
  import type { Snippet } from 'svelte';
  import { RefreshCw } from 'lucide-svelte';
  import RotatingCoin from '$lib/components/loading-screen/rotating-coin.svelte';
  import TournamentLeaderboard from './tournament-leaderboard.svelte';
  import Button from '$lib/components/ui/button/button.svelte';
  import {
    fetchTournamentLeaderboard,
    sortEntriesByRankingMode,
    type LeaderboardEntry,
    type LeaderboardResponse,
    type RankingMode,
    TOURNAMENT_START,
  } from './tournament.service';

  type Props = {
    setCustomTitle?: (title: Snippet<[]> | null) => void;
    setCustomControls?: (controls: Snippet<[]> | null) => void;
  };

  let { setCustomTitle, setCustomControls }: Props = $props();

  let leaderboardPromise = $state<Promise<LeaderboardResponse> | null>(null);
  let refreshInterval: NodeJS.Timeout;
  let isRefreshing = $state(false);
  let rankingMode = $state<RankingMode>('best');

  const sortedEntries = $derived.by(() => {
    if (!leaderboardPromise) return null;
    return leaderboardPromise.then((data) =>
      sortEntriesByRankingMode(data.entries, rankingMode),
    );
  });

  async function refresh() {
    if (isRefreshing) return;
    isRefreshing = true;
    leaderboardPromise = null;

    try {
      leaderboardPromise = fetchTournamentLeaderboard();
      await leaderboardPromise;
    } finally {
      isRefreshing = false;
    }
  }

  onMount(() => {
    refresh();

    // Refresh every 60 seconds
    refreshInterval = setInterval(refresh, 60000);

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  });

  // Set up custom controls with refresh button
  $effect(() => {
    if (setCustomControls) {
      setCustomControls(refreshControls);
    }
  });

  // Format tournament start date for display
  const formattedStartDate = new Date(TOURNAMENT_START).toLocaleDateString(
    'en-US',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    },
  );
</script>

<div class="flex flex-col h-full min-h-0">
  <!-- Header with tournament info -->
  <div class="px-2 py-1 text-xs text-gray-400 border-b border-gray-700">
    Positions closed since {formattedStartDate}
  </div>

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
      Total PnL
    </Button>
  </div>

  <!-- Content -->
  <div class="flex-1 overflow-auto min-h-0">
    {#if sortedEntries}
      {#await sortedEntries}
        <div
          class="text-center py-8 text-gray-400 flex flex-col items-center gap-4"
        >
          <RotatingCoin />
          <span>Loading tournament data...</span>
        </div>
      {:then entries}
        {#if entries.length === 0}
          <div class="text-center py-8 text-gray-400">
            No tournament positions yet
          </div>
        {:else}
          <TournamentLeaderboard {entries} {rankingMode} />
        {/if}
      {:catch error}
        <div class="text-center py-8 text-red-400">Error: {error.message}</div>
      {/await}
    {:else}
      <div
        class="text-center py-8 text-gray-400 flex flex-col items-center gap-4"
      >
        <RotatingCoin />
        <span>Loading tournament data...</span>
      </div>
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
      aria-label="Refresh tournament"
      title="Refresh tournament leaderboard"
    >
      <RefreshCw size={16} />
    </button>
  {/if}
{/snippet}
