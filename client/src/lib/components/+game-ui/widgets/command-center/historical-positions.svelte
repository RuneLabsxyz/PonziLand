<script lang="ts">
  import { ScrollArea } from '$lib/components/ui/scroll-area';
  import { useDojo } from '$lib/contexts/dojo';
  import { padAddress } from '$lib/utils';
  import { onMount } from 'svelte';
  import {
    fetchHistoricalPositions,
    type HistoricalPosition,
  } from './historical-positions.service';
  import PositionEntry from './position-entry.svelte';

  const dojo = useDojo();
  const account = () => {
    return dojo.accountManager?.getProvider();
  };

  let positions = $state<HistoricalPosition[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let refreshInterval: NodeJS.Timeout;

  async function loadPositions() {
    try {
      const currentAccount = account()?.getWalletAccount();
      if (!currentAccount) {
        error = 'No wallet account available';
        loading = false;
        return;
      }

      const userAddress = padAddress(currentAccount.address)!;
      positions = await fetchHistoricalPositions(userAddress);
      error = null;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load positions';
      console.error('Error loading positions:', err);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadPositions();

    // Refresh every 60 seconds
    refreshInterval = setInterval(loadPositions, 60000);

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  });
</script>

<ScrollArea type="scroll" class="flex-1">
  <div class="flex flex-col">
    {#if loading}
      <div class="text-center py-8 text-gray-400">Loading positions...</div>
    {:else if error}
      <div class="text-center py-8 text-red-400">
        Error: {error}
      </div>
    {:else if positions.length === 0}
      <div class="text-center py-8 text-gray-400">
        No historical positions yet
      </div>
    {:else}
      <div class="px-4 pb-2">
        <div
          class="grid grid-cols-7 gap-2 text-xs text-gray-400 border-b border-gray-700 pb-2 mb-2"
        >
          <div>Location</div>
          <div>Bought</div>
          <div>Closed</div>
          <div>Status</div>
          <div class="text-right">Buy Cost</div>
          <div class="text-right">Revenue</div>
          <div class="text-right">P&L</div>
        </div>
      </div>
      {#each positions as position (position.id)}
        <PositionEntry {position} />
      {/each}
    {/if}
  </div>
</ScrollArea>
