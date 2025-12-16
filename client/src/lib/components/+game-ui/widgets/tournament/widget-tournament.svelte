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
  import SetUsernameButton from '$lib/components/socialink/SetUsernameButton.svelte';

  // Tournament end: Dec 19, 14:30 Paris time (CET = UTC+1) = 13:30 UTC
  const TOURNAMENT_END = '2025-12-19T13:30:00Z';

  type Props = {
    setCustomTitle?: (title: Snippet<[]> | null) => void;
    setCustomControls?: (controls: Snippet<[]> | null) => void;
  };

  let { setCustomTitle, setCustomControls }: Props = $props();

  let leaderboardPromise = $state<Promise<LeaderboardResponse> | null>(null);
  let refreshInterval: NodeJS.Timeout;
  let countdownInterval: NodeJS.Timeout;
  let isRefreshing = $state(false);
  let rankingMode = $state<RankingMode>('best');
  let now = $state(new Date());

  // Tournament timing
  const tournamentStart = new Date(TOURNAMENT_START);
  const tournamentEnd = new Date(TOURNAMENT_END);

  const hasStarted = $derived(now >= tournamentStart);
  const hasEnded = $derived(now >= tournamentEnd);

  const countdown = $derived.by(() => {
    const targetDate = hasStarted ? tournamentEnd : tournamentStart;
    const diff = targetDate.getTime() - now.getTime();

    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds };
  });

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

  function formatCountdown(c: {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }): string {
    const parts = [];
    if (c.days > 0) parts.push(`${c.days}d`);
    if (c.hours > 0 || c.days > 0) parts.push(`${c.hours}h`);
    if (c.minutes > 0 || c.hours > 0 || c.days > 0) parts.push(`${c.minutes}m`);
    parts.push(`${c.seconds}s`);
    return parts.join(' ');
  }

  onMount(() => {
    refresh();

    // Refresh leaderboard every 60 seconds
    refreshInterval = setInterval(refresh, 60000);

    // Update countdown every second
    countdownInterval = setInterval(() => {
      now = new Date();
    }, 1000);

    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
      if (countdownInterval) clearInterval(countdownInterval);
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
  <!-- Countdown Timer -->
  <div class="px-3 py-2 bg-gray-900/50 border-b border-gray-700">
    <div class="flex items-center">
      <!-- Left column: Set Username button (or empty space) -->
      <div class="flex-1 flex justify-start">
        <SetUsernameButton />
      </div>

      <!-- Center column: Countdown -->
      <div class="flex-1 flex justify-center">
        {#if hasEnded}
          <div class="text-center">
            <span class="text-yellow-400 font-semibold text-sm">
              Tournament Ended
            </span>
          </div>
        {:else if hasStarted}
          <div class="text-center">
            <span class="text-gray-400 text-md">Tournament ends in</span>
            <div
              class="text-green-400 font-ponzi-number text-lg font-bold tracking-wider"
            >
              T-{formatCountdown(countdown)}
            </div>
          </div>
        {:else}
          <div class="text-center">
            <span class="text-gray-400 text-md">Tournament starts in</span>
            <div
              class="text-yellow-400 font-ponzi-number text-lg font-bold tracking-wider"
            >
              T-{formatCountdown(countdown)}
            </div>
          </div>
        {/if}
      </div>

      <!-- Right column: Empty for balance -->
      <div class="flex-1"></div>
    </div>
  </div>

  <!-- Header with tournament info -->
  <div class="px-2 py-1 text-xs text-gray-400 border-b border-gray-700">
    Positions since {formattedStartDate}
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
      Best PnL
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
