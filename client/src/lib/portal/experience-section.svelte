<script lang="ts">
  import { Card } from '$lib/components/ui/card';
  import { Progress } from '$lib/components/ui/progress';
  import accountDataProvider, { setup } from '$lib/account.svelte';

  let address = $derived(accountDataProvider.address);

  interface UserStats {
    address: string;
    total_points: number;
    rank: number;
    total_users: number;
    completions_count: number;
  }

  interface RankTier {
    name: string;
    color: string;
    bgGradient: string;
    minPercentile: number;
    icon: string;
  }

  const RANK_TIERS: RankTier[] = [
    {
      name: 'Diamond',
      color: 'text-cyan-300',
      bgGradient: 'from-cyan-400/20 via-blue-400/20 to-cyan-400/20',
      minPercentile: 99,
      icon: '💎',
    },
    {
      name: 'Platinum',
      color: 'text-slate-300',
      bgGradient: 'from-slate-300/20 via-white/20 to-slate-300/20',
      minPercentile: 90,
      icon: '🏆',
    },
    {
      name: 'Gold',
      color: 'text-yellow-400',
      bgGradient: 'from-yellow-400/20 via-amber-400/20 to-yellow-400/20',
      minPercentile: 75,
      icon: '🥇',
    },
    {
      name: 'Silver',
      color: 'text-gray-300',
      bgGradient: 'from-gray-300/20 via-slate-300/20 to-gray-300/20',
      minPercentile: 50,
      icon: '🥈',
    },
    {
      name: 'Bronze',
      color: 'text-orange-600',
      bgGradient: 'from-orange-600/20 via-amber-700/20 to-orange-600/20',
      minPercentile: 0,
      icon: '🥉',
    },
  ];

  let userStats: UserStats | null = $state(null);
  let loading = $state(true);
  let error: string | null = $state(null);
  let userAddress: string | null = $state(null);

  let percentile: number | null = $state(null);
  let rankTier: RankTier[] | null = $state(null);

  $effect(() => {
    if (userStats) {
      percentile =
        ((userStats.total_users - userStats.rank + 1) / userStats.total_users) *
        100;
    }
  });

  $effect(() => {
    if (percentile) {
      rankTier =
        RANK_TIERS.find((tier) => percentile >= tier.minPercentile) ||
        RANK_TIERS[4];
    }
  });

  async function fetchUserStats(address: string) {
    try {
      loading = true;
      error = null;
      const response = await fetch(
        `https://xperience.ponzi.land/api/${address}/status`,
      );

      if (!response.ok) {
        throw new Error('Failed to fetch user stats');
      }

      userStats = await response.json();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load stats';
      console.error('Error fetching user stats:', err);
    } finally {
      loading = false;
    }
  }
</script>

<div class="relative w-full max-w-md mx-auto px-4">
  <Card
    class="bg-black/90 border-2 border-purple-600/50 backdrop-blur-md p-6 shadow-2xl shadow-purple-500/20"
  >
    <div class="space-y-4">
      <h2
        class="text-3xl font-bold text-center bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent uppercase tracking-wider"
      >
        Experience Portal
      </h2>
      {#if !userAddress}
        <div class="text-center py-4 text-gray-400">
          Connect your wallet to view stats
        </div>
      {:else if userStats && rankTier && percentile}
        <div class="space-y-6">
          <!-- Rank Tier Display -->
          <div class="text-center">
            <div class="text-4xl mb-2">{rankTier.icon}</div>
            <h3 class="text-xl font-bold {rankTier.color}">
              {rankTier.name} Tier
            </h3>
            <p class="text-sm text-gray-400 mt-1">
              Top {percentile.toFixed(1)}%
            </p>
          </div>

          <!-- Stats Grid -->
          <div class="grid grid-cols-2 gap-4">
            <div
              class="bg-gradient-to-br {rankTier.bgGradient} rounded-lg p-4 border-2 border-yellow-600/30 shadow-lg shadow-{rankTier.color}/20"
            >
              <div class="text-sm text-gray-300">Points</div>
              <div class="text-2xl font-bold text-white">
                {userStats.total_points.toLocaleString()}
              </div>
            </div>

            <div
              class="bg-gradient-to-br {rankTier.bgGradient} rounded-lg p-4 border-2 border-yellow-600/30 shadow-lg shadow-{rankTier.color}/20"
            >
              <div class="text-sm text-gray-300">Rank</div>
              <div class="text-2xl font-bold text-white">
                #{userStats.rank}
                <span class="text-sm text-gray-400"
                  >/ {userStats.total_users}</span
                >
              </div>
            </div>
          </div>

          <!-- Progress Bar -->
          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-gray-400">Percentile Progress</span>
              <span class="{rankTier.color} font-semibold"
                >{percentile.toFixed(1)}%</span
              >
            </div>
            <Progress value={percentile} class="h-2 bg-gray-700">
              <div
                class="h-full bg-gradient-to-r {rankTier.bgGradient} rounded-full transition-all duration-500"
                style="width: {percentile}%"
              ></div>
            </Progress>
          </div>

          <!-- Completions -->
          {#if userStats.completions_count > 0}
            <div class="text-center pt-2 border-t border-yellow-600/30">
              <p class="text-sm text-gray-400">
                Completions: <span class="text-white font-semibold"
                  >{userStats.completions_count}</span
                >
              </p>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </Card>
</div>

<style>
  :global(.progress) {
    background-color: rgb(55 65 81);
  }

  @keyframes glow {
    0%,
    100% {
      box-shadow: 0 0 20px rgba(147, 51, 234, 0.5);
    }
    50% {
      box-shadow: 0 0 30px rgba(147, 51, 234, 0.8);
    }
  }
</style>

