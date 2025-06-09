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
      const result = await socialink.joinTeamFlow(
        accountDataProvider.address,
        selectedTeam,
        accountDataProvider.walletAccount,
      );

      if (result.ok) {
        console.log(`Successfully joined ${selectedTeam}!`);

        console.log('New team stats:', result.data?.teamStats);

        return result.data?.team;
      } else {
        console.error('Failed to join team:', result.error);

        return null;
      }
    } catch (error) {
      console.error('Error joining team:', error);

      return null;
    }
  }

  onMount(async () => {
    const response = await fetch(url);
    const data = await response.json();
    teamInfo = data.team;
  });
</script>

<div class="w-full h-full pt-12">
  {#if !teamInfo}
    <div class="flex flex-col gap-6">
      <div class="flex gap-4 w-full justify-around py-6">
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
              alt={`${team.name} Png`}
              class="w-32 h-32 transition-all duration-200"
              class:ring-4={selectedTeam === team.id}
              class:ring-blue-500={selectedTeam === team.id}
              class:ring-offset-2={selectedTeam === team.id}
            />
            <span class="text-base mt-3">{team.name}</span>
          </div>
        {/each}
      </div>

      <div class="text-center text-white px-8 mb-6 text-lg leading-relaxed">
        <p>
          Select your team below. <br />
          <strong>This choice is final and cannot be changed later.</strong>
          <br />
          Choose wisely — your team will represent you in the game!
        </p>
      </div>

      <Button
        class="px-8 py-3 bg-blue-500 text-white rounded-lg text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mx-auto"
        disabled={!selectedTeam}
        onclick={joinTeam}
      >
        Join Team
      </Button>
    </div>
  {/if}
</div>
