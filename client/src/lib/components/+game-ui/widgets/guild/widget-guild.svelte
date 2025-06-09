<script lang="ts">
  import { PUBLIC_SOCIALINK_URL } from '$env/static/public';
  import accountDataProvider, { setup } from '$lib/account.svelte';
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import { getSocialink } from '$lib/accounts/social/index.svelte';

  const socialink = getSocialink();

  type Team = 'Wolf Nation' | 'Blobert' | 'Everai' | 'Ducks everywhere';

  let url = $derived(
    `${PUBLIC_SOCIALINK_URL}/api/user/${accountDataProvider.address}/team/info`,
  );

  let teamInfo = $state<any>(null);
  let selectedTeam = $state<Team | null>(null);
  let isLoading = $state(false);
  let hasError = $state(false);
  let isInitialLoading = $state(true);

  const teams = [
    {
      id: 'Ducks everywhere',
      name: 'Duck Team',
      image: '/extra/agents/duck.png',
    },
    { id: 'Wolf Nation', name: 'Wolf Team', image: '/extra/agents/wolf.png' },
    { id: 'Everai', name: 'Everai Team', image: '/extra/agents/everai.png' },
    { id: 'Blobert', name: 'Blobert Team', image: '/extra/agents/blobert.png' },
  ];

  function selectTeam(teamId: Team) {
    selectedTeam = teamId;
  }

  async function joinTeam() {
    if (
      !accountDataProvider.address ||
      !selectedTeam ||
      !accountDataProvider.walletAccount
    ) {
      console.error('User address or team name is missing');
      return null;
    }
    try {
      isLoading = true;
      hasError = false;
      const result = await socialink.joinTeamFlow(
        accountDataProvider.address,
        selectedTeam,
        accountDataProvider.walletAccount,
      );

      if (result.ok) {
        console.log(`Successfully joined ${selectedTeam}!`);
        console.log('New team stats:', result.data?.teamStats);
        teamInfo = result.data?.team;
        return result.data?.team;
      } else {
        console.error('Failed to join team:', result.error);
        hasError = true;
        return null;
      }
    } catch (error) {
      console.error('Error joining team:', error);
      hasError = true;
      return null;
    } finally {
      isLoading = false;
    }
  }

  onMount(async () => {
    try {
      const response = await fetch(url);
      const data = await response.json();
      teamInfo = data.team;
    } catch (error) {
      console.error('Failed to fetch team info:', error);
    } finally {
      isInitialLoading = false;
    }
  });
</script>

<div class="w-full h-full">
  {#if isInitialLoading}
    <div class="flex items-center justify-center h-full">
      <span class="text-white text-xl">Loading...</span>
    </div>
  {:else if !teamInfo}
    <div class="flex flex-col gap-4">
      <div class="flex gap-1 w-full justify-around py-8">
        {#each teams as team}
          <div
            class="flex flex-col items-center cursor-pointer"
            onclick={() => selectTeam(team.id as Team)}
            onkeydown={(e) => e.key === 'Enter' && selectTeam(team.id as Team)}
            role="button"
            tabindex="0"
          >
            <img
              src={team.image}
              alt={team.name}
              class="w-48 h-48 transition-all duration-200"
              class:ring-4={selectedTeam === team.id}
              class:ring-blue-500={selectedTeam === team.id}
              class:ring-offset-2={selectedTeam === team.id}
            />
            <span class="text-sm mt-2">{team.name}</span>
          </div>
        {/each}
      </div>

      <div class="text-center text-white mb-4 text-xl">
        Select your team below. This choice cannot be changed later.
      </div>

      <Button
        variant="blue"
        class="mx-auto"
        disabled={!selectedTeam || isLoading}
        onclick={joinTeam}
      >
        {#if isLoading}
          Loading...
        {:else if hasError}
          Failed
        {:else}
          Join Team
        {/if}
      </Button>
    </div>
  {:else}
    <div
      class="flex flex-col items-center justify-center h-full gap-4 text-ponzi-number"
    >
      <img
        src={teams.find((t) => t.id === teamInfo.teamName)?.image}
        alt={teamInfo.teamName}
        class="w-48 h-48"
      />
      <div class="text-center text-white text-xl">
        Your guild is {teamInfo.teamName}
      </div>
    </div>
  {/if}
</div>
