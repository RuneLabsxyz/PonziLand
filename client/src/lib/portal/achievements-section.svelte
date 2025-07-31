<script lang="ts">
  import { Card } from '$lib/components/ui/card';
  import { Trophy, Award, CheckCircle, Circle, Star } from 'lucide-svelte';
  import { onMount } from 'svelte';

  interface Achievement {
    id: number;
    title: string;
    description: string;
    points: number;
    is_dynamic: boolean;
    completed: boolean;
    points_awarded: number | null;
    completed_at: string | null;
  }

  interface AchievementsData {
    address: string;
    total_points: number;
    rank: number;
    total_users: number;
    tasks: Achievement[];
  }

  interface Props {
    address: string;
  }

  let { address }: Props = $props();

  let achievementsData = $state<AchievementsData | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);

  async function fetchAchievements() {
    if (!address) return;

    loading = true;
    error = null;

    try {
      const response = await fetch(
        `https://xperience.ponzi.land/api/${address}/details`,
      );
      if (!response.ok) {
        throw new Error('Failed to fetch achievements');
      }
      achievementsData = await response.json();
    } catch (err) {
      error =
        err instanceof Error ? err.message : 'Failed to load achievements';
      console.error('Error fetching achievements:', err);
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    if (address) {
      fetchAchievements();
    }
  });

  onMount(() => {
    fetchAchievements();
  });

  const completedAchievements = $derived(
    achievementsData?.tasks.filter((task) => task.completed) || [],
  );

  const pendingAchievements = $derived(
    achievementsData?.tasks.filter((task) => !task.completed) || [],
  );
</script>

<Card class="bg-gray-800/50 backdrop-blur-sm border border-gray-700">
  <div class="p-8">
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-4">
        <div class="p-3 bg-gray-700/50 rounded-lg">
          <Trophy class="w-6 h-6 text-yellow-400" />
        </div>
        <h2 class="text-2xl font-semibold text-white">Achievements</h2>
      </div>
      {#if achievementsData}
        <div class="flex items-center gap-6">
          <div class="text-right">
            <p class="text-sm text-gray-400">Total Points</p>
            <p class="text-2xl font-bold text-yellow-400">
              {achievementsData.total_points}
            </p>
          </div>
          <div class="text-right">
            <p class="text-sm text-gray-400">Rank</p>
            <p class="text-2xl font-bold text-white">
              #{achievementsData.rank} / {achievementsData.total_users}
            </p>
          </div>
        </div>
      {/if}
    </div>

    {#if loading}
      <div class="flex items-center justify-center py-12">
        <div
          class="animate-spin rounded-full h-8 w-8 border-b-2 border-white"
        ></div>
      </div>
    {:else if error}
      <div class="text-red-500 text-center py-8">
        {error}
      </div>
    {:else if achievementsData}
      <div class="space-y-6">
        {#if completedAchievements.length > 0}
          <div>
            <h3
              class="text-lg font-medium text-white mb-4 flex items-center gap-2"
            >
              <CheckCircle class="w-5 h-5 text-green-400" />
              Completed Achievements
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              {#each completedAchievements as achievement}
                <div
                  class="p-4 bg-gray-900/50 rounded-lg border border-green-500/20 hover:border-green-500/40 transition-colors"
                >
                  <div class="flex items-start gap-3">
                    <div class="p-2 bg-green-500/20 rounded-lg mt-1">
                      <Award class="w-5 h-5 text-green-400" />
                    </div>
                    <div class="flex-1">
                      <h4 class="font-medium text-white mb-1">
                        {achievement.title}
                      </h4>
                      <p class="text-sm text-gray-400 mb-2">
                        {achievement.description}
                      </p>
                      <div class="flex items-center justify-between">
                        <span class="text-sm text-yellow-400 font-medium"
                          >+{achievement.points_awarded} points</span
                        >
                        {#if achievement.completed_at}
                          <span class="text-xs text-gray-500">
                            {new Date(
                              achievement.completed_at,
                            ).toLocaleDateString()}
                          </span>
                        {/if}
                      </div>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        {#if pendingAchievements.length > 0}
          <div>
            <h3
              class="text-lg font-medium text-white mb-4 flex items-center gap-2"
            >
              <Circle class="w-5 h-5 text-gray-400" />
              Available Achievements
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              {#each pendingAchievements as achievement}
                <div
                  class="p-4 bg-gray-900/50 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
                >
                  <div class="flex items-start gap-3">
                    <div class="p-2 bg-gray-700/50 rounded-lg mt-1">
                      <Star class="w-5 h-5 text-gray-400" />
                    </div>
                    <div class="flex-1">
                      <h4 class="font-medium text-white mb-1">
                        {achievement.title}
                      </h4>
                      <p class="text-sm text-gray-400 mb-2">
                        {achievement.description}
                      </p>
                      <span class="text-sm text-gray-500"
                        >+{achievement.points} points</span
                      >
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        {#if achievementsData.tasks.length === 0}
          <p class="text-gray-400 text-center py-8">
            No achievements available yet
          </p>
        {/if}
      </div>
    {:else}
      <p class="text-gray-400 text-center py-8">
        Connect your wallet to view achievements
      </p>
    {/if}
  </div>
</Card>
