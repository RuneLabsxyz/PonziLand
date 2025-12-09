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
  let timePeriod = $state<'1D' | '1W' | '1M' | '1Y' | 'ALL'>('ALL');
  let activePositionsOpen = $state(true);
  let closedPositionsOpen = $state(false);

  // Check if a position is still active (no close_date means it's still open)
  function isPositionOpen(position: HistoricalPosition): boolean {
    return !position.close_date || position.close_date === null;
  }

  // Filter positions by time period
  function filterByTimePeriod(
    positions: HistoricalPosition[],
  ): HistoricalPosition[] {
    if (timePeriod === 'ALL') return positions;

    const now = new Date();
    const cutoffDate = new Date();

    switch (timePeriod) {
      case '1D':
        cutoffDate.setDate(now.getDate() - 1);
        break;
      case '1W':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case '1M':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case '1Y':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    return positions.filter((position) => {
      const positionDate = new Date(position.time_bought);
      return positionDate >= cutoffDate;
    });
  }

  // Separate active and closed positions
  const activePositions = $derived.by(() => {
    return filterByTimePeriod(positions)
      .filter(isPositionOpen)
      .sort(
        (a, b) =>
          new Date(b.time_bought).getTime() - new Date(a.time_bought).getTime(),
      );
  });

  const closedPositions = $derived.by(() => {
    return filterByTimePeriod(positions)
      .filter((p) => !isPositionOpen(p))
      .sort(
        (a, b) =>
          new Date(b.time_bought).getTime() - new Date(a.time_bought).getTime(),
      );
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

<div class="w-full flex justify-end p-2">
  <div class="flex">
    <Button
      size="md"
      variant={timePeriod === '1D' ? 'blue' : 'red'}
      onclick={() => (timePeriod = '1D')}
    >
      1D
    </Button>
    <Button
      size="md"
      variant={timePeriod === '1W' ? 'blue' : 'red'}
      onclick={() => (timePeriod = '1W')}
    >
      1W
    </Button>
    <Button
      size="md"
      variant={timePeriod === '1M' ? 'blue' : 'red'}
      onclick={() => (timePeriod = '1M')}
    >
      1M
    </Button>
    <Button
      size="md"
      variant={timePeriod === '1Y' ? 'blue' : 'red'}
      onclick={() => (timePeriod = '1Y')}
    >
      1Y
    </Button>
    <Button
      size="md"
      variant={timePeriod === 'ALL' ? 'blue' : 'red'}
      onclick={() => (timePeriod = 'ALL')}
    >
      ALL
    </Button>
  </div>
</div>
<div class="flex flex-col h-full min-h-0">
  <ScrollArea orientation="both" type="scroll" class="flex-1">
    <div class="flex flex-col min-h-0 min-w-[1400px]">
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
        <div
          class="px-4 grid grid-cols-9 gap-2 text-xs text-gray-400 border-b border-gray-700 pb-2 mb-2"
        >
          <div>Location</div>
          <div>Status</div>
          <div>Bought</div>
          <div>Close</div>
          <div class="text-right">Buy Cost</div>
          <div class="text-right">Sold For</div>
          <div class="text-right">Net Flow</div>
          <div class="text-right">Sale P&L</div>
          <div class="text-right">P&L</div>
        </div>

        <!-- Closed Positions Section -->
        {#if closedPositions.length > 0}
          {#each closedPositions as position (position.id)}
            <PositionEntry {position} {isPositionOpen} />
          {/each}
        {/if}

        {#if activePositions.length === 0 && closedPositions.length === 0}
          <div class="text-center py-8 text-gray-400">
            No positions found for the selected time period
          </div>
        {/if}
      {/if}
    </div>
  </ScrollArea>
</div>
