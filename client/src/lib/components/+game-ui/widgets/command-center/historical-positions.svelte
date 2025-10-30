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
  import Button from '$lib/components/ui/button/button.svelte';

  const dojo = useDojo();
  const account = () => {
    return dojo.accountManager?.getProvider();
  };

  let positions = $state<HistoricalPosition[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let refreshInterval: NodeJS.Timeout;
  let filter = $state<'all' | 'open' | 'closed'>('all');

  // Check if a position is still active (no close_date means it's still open)
  function isPositionOpen(position: HistoricalPosition): boolean {
    return !position.close_date || position.close_date === null;
  }

  // Filter and sort positions
  const filteredPositions = $derived(() => {
    let filtered = positions;

    if (filter === 'open') {
      filtered = positions.filter(isPositionOpen);
    } else if (filter === 'closed') {
      filtered = positions.filter((p) => !isPositionOpen(p));
    }

    // Sort: open positions first, then by time_bought descending
    return filtered.sort((a, b) => {
      const aOpen = isPositionOpen(a);
      const bOpen = isPositionOpen(b);

      if (aOpen && !bOpen) return -1;
      if (!aOpen && bOpen) return 1;

      // Both same status, sort by time_bought descending
      return (
        new Date(b.time_bought).getTime() - new Date(a.time_bought).getTime()
      );
    });
  });

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

<div class="flex flex-col h-full">
  {#if !loading && positions.length > 0}
    <!-- Filter buttons -->
    <div class="flex gap-2 px-4 pb-3">
      <Button
        class="text-xs px-3 py-1 {filter === 'all' ? '' : 'opacity-60'}"
        variant={filter === 'all' ? 'blue' : 'ghost'}
        onclick={() => (filter = 'all')}
      >
        All ({positions.length})
      </Button>
      <Button
        class="text-xs px-3 py-1 {filter === 'open' ? '' : 'opacity-60'}"
        variant={filter === 'open' ? 'green' : 'ghost'}
        onclick={() => (filter = 'open')}
      >
        Active ({positions.filter(isPositionOpen).length})
      </Button>
      <Button
        class="text-xs px-3 py-1 {filter === 'closed' ? '' : 'opacity-60'}"
        variant={filter === 'closed' ? 'red' : 'ghost'}
        onclick={() => (filter = 'closed')}
      >
        Closed ({positions.filter((p) => !isPositionOpen(p)).length})
      </Button>
    </div>
  {/if}

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
      {:else if filteredPositions().length === 0}
        <div class="text-center py-8 text-gray-400">
          No {filter === 'open' ? 'active' : 'closed'} positions
        </div>
      {:else}
        <div class="px-4 pb-2">
          <div
            class="grid grid-cols-7 gap-2 text-xs text-gray-400 border-b border-gray-700 pb-2 mb-2"
          >
            <div>Location</div>
            <div>Bought</div>
            <div>Status</div>
            <div>Close</div>
            <div class="text-right">Buy Cost</div>
            <div class="text-right">Sold For</div>
            <div class="text-right">P&L</div>
          </div>
        </div>
        {#each filteredPositions() as position (position.id)}
          <PositionEntry {position} {isPositionOpen} />
        {/each}
      {/if}
    </div>
  </ScrollArea>
</div>
