<script lang="ts">
  import { ScrollArea } from '$lib/components/ui/scroll-area';
  import { usernamesStore } from '$lib/stores/account.svelte';
  import { getBuyEvents } from '../request';
  import { onMount } from 'svelte';
  import { formatAddress, formatValue } from '../helpers';
  import { padAddress } from '$lib/utils';

  let { leaderboardSize = 0, address } = $props();

  let leaderboard = $state<Array<{ address: string; buys: number }>>([]);
  let isLoading = $state(true);

  onMount(async () => {
    const buyEvents: Array<{ buyer: string }> = await getBuyEvents();

    const buyCount: Record<string, number> = {};

    // Count
    buyEvents.forEach(({ buyer }: { buyer: string }) => {
      if (buyCount[buyer]) {
        buyCount[buyer]++;
      } else {
        buyCount[buyer] = 1;
      }
    });

    // Sort
    leaderboard = Object.entries(buyCount)
      .map(([address, buys]) => ({ address, buys }))
      .sort((a, b) => b.buys - a.buys);

    isLoading = false;
  });
</script>

<ScrollArea
  class={`${leaderboardSize === 1 ? 'h-96' : 'h-32'} w-full text-white`}
>
  {#if isLoading}
    <div class="text-center py-2">Loading leaderboard data...</div>
  {:else if leaderboard.length === 0}
    <div class="text-center py-2">No data available</div>
  {:else}
    {#each leaderboard as user, index}
      <div class="flex justify-between items-center p-2 rounded">
        <div class="flex items-center gap-2">
          <span class="font-bold">
            {index + 1}.
          </span>
          <span class="font-mono" class:text-red-500={user.address === address}
            >{usernamesStore.getUsernames()[padAddress(user.address)!] ||
              formatAddress(user.address)}</span
          >
          {#if user.address === address}
            <span class="text-xs bg-primary/30 px-1 rounded">You</span>
          {/if}
          {#if index === 0}
            <img src="/extra/crown.png" alt="Crown" class="w-4 h-4" />
          {/if}
        </div>
        <div class="font-bold">
          {Math.floor(user.buys)}
        </div>
      </div>
    {/each}
  {/if}
</ScrollArea>
