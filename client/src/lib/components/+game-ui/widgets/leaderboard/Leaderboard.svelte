<script lang="ts">
  import { onMount } from 'svelte';
  import accountData from '$lib/account.svelte';
  import { fetchUsernamesBatch, getUserAddresses } from './request';
  import Card from '$lib/components/ui/card/card.svelte';
  import { usernamesStore } from '$lib/stores/account.store.svelte';
  import AssetLeaderboard from './leaderboards/AssetLeaderboard.svelte';
  import LandBuyLeaderboard from './leaderboards/LandBuyLeaderboard.svelte';

  let { leaderboardSize = 0 } = $props();

  const address = $derived(accountData.address);
  let loading = $state(true);
  let displayedLeaderboard = $state(0);

  async function getUsernames() {
    try {
      const addresses = usernamesStore.getAddresses().map((a) => a.address);

      if (addresses.length === 0) {
        console.warn('No addresses to lookup.');
        return;
      }

      const fetchedUsernames = await fetchUsernamesBatch(addresses);

      await usernamesStore.updateUsernames(fetchedUsernames);
    } catch (error) {
      console.error('Error refreshing usernames:', error);
    }
  }

  onMount(async () => {
    const addresses: Array<{ address: string }> = await getUserAddresses();

    const formattedAddresses = addresses.map(({ address }) => ({
      address: address,
    }));

    usernamesStore.addAddresses(formattedAddresses);

    await getUsernames();
    loading = false;
  });

  async function refreshLeaderboard() {
    loading = true;
    await getUsernames();
    loading = false;
  }
</script>

<Card class="shadow-ponzi w-72">
  <div class="flex justify-between items-center mr-3 mb-2 text-white">
    <div class="text-2xl text-shadow-none">leaderboard</div>
    <button onclick={refreshLeaderboard} aria-label="Refresh balance">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 32 32"
        width="32px"
        height="32px"
        fill="currentColor"
        class="h-5 w-5"
      >
        <path
          d="M 6 4 L 6 6 L 4 6 L 4 8 L 2 8 L 2 10 L 6 10 L 6 26 L 17 26 L 17 24 L 8 24 L 8 10 L 12 10 L 12 8 L 10 8 L 10 6 L 8 6 L 8 4 L 6 4 z M 15 6 L 15 8 L 24 8 L 24 22 L 20 22 L 20 24 L 22 24 L 22 26 L 24 26 L 24 28 L 26 28 L 26 26 L 28 26 L 28 24 L 30 24 L 30 22 L 26 22 L 26 6 L 15 6 z"
        />
      </svg>
    </button>
  </div>

  <div class="flex mb-4">
    <button
      class="flex-1 py-2 text-white {displayedLeaderboard === 0
        ? 'bg-purple-600'
        : 'bg-purple-800'}"
      onclick={() => (displayedLeaderboard = 0)}
    >
      Assets
    </button>
    <button
      class="flex-1 py-2 text-white {displayedLeaderboard === 1
        ? 'bg-purple-600'
        : 'bg-purple-800'}"
      onclick={() => (displayedLeaderboard = 1)}
    >
      Land Buy
    </button>
  </div>

  {#if loading}
    <div class="text-center py-2">Loading leaderboard data...</div>
  {:else if displayedLeaderboard === 0}
    <AssetLeaderboard {leaderboardSize} {address} />
  {:else}
    <LandBuyLeaderboard {leaderboardSize} {address} />
  {/if}
</Card>
