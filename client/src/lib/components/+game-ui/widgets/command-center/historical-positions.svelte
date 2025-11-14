<script lang="ts">
  import { ScrollArea } from '$lib/components/ui/scroll-area';
  import { useDojo } from '$lib/contexts/dojo';
  import { padAddress } from '$lib/utils';
  import { onMount } from 'svelte';
  import {
    fetchHistoricalPositions,
    type HistoricalPosition,
  } from './historical-positions.service';
  import Button from '$lib/components/ui/button/button.svelte';
  import DataTable from './data-table.svelte';
  import { columns } from './historical-positions-columns';
  import * as Avatar from '$lib/components/ui/avatar/index.js';
  import { getFullTokenInfo, locationToCoordinates } from '$lib/utils';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { widgetsStore } from '$lib/stores/widgets.store';

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

  // Filter positions by time period and combine all filtered data
  const filteredPositions = $derived.by(() => {
    let filtered = positions;

    if (timePeriod !== 'ALL') {
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

      filtered = positions.filter((position) => {
        const positionDate = new Date(position.time_bought);
        return positionDate >= cutoffDate;
      });
    }

    return filtered.sort(
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

  // Function to generate expanded content for token flows
  function generateExpandedContent(position: HistoricalPosition): string {
    const inflowEntries = Object.entries(position.token_inflows);
    const outflowEntries = Object.entries(position.token_outflows);

    let content = `
      <div class="grid grid-cols-2 gap-4 mt-2">
        <div>
          <div class="flex justify-between items-center mb-2">
            <h4 class="text-gray-400">Token Inflows</h4>
          </div>
    `;

    if (inflowEntries.length > 0) {
      content += '<div class="space-y-1">';
      for (const [token, amount] of inflowEntries) {
        const fullTokenInfo = getFullTokenInfo(token);
        if (fullTokenInfo) {
          content += `
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-2 min-w-0">
                <div class="h-5 w-5 rounded-full bg-gray-600 flex-shrink-0 flex items-center justify-center">
                  <span class="text-[8px]">${fullTokenInfo.token.symbol.slice(0, 3)}</span>
                </div>
                <span class="text-gray-400 truncate" title="${token}">
                  ${fullTokenInfo.token.symbol}
                </span>
              </div>
              <span class="text-green-400 ml-2 flex-shrink-0">
                +${CurrencyAmount.fromUnscaled(amount, fullTokenInfo.token).toString()}
              </span>
            </div>
          `;
        }
      }
      content += '</div>';
    } else {
      content += '<div class="text-gray-600">No inflows</div>';
    }

    content += `
        </div>
        <div>
          <div class="flex justify-between items-center mb-2">
            <h4 class="text-gray-400">Token Outflows</h4>
          </div>
    `;

    if (outflowEntries.length > 0) {
      content += '<div class="space-y-1">';
      for (const [token, amount] of outflowEntries) {
        const fullTokenInfo = getFullTokenInfo(token);
        if (fullTokenInfo) {
          content += `
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-2 min-w-0">
                <div class="h-5 w-5 rounded-full bg-gray-600 flex-shrink-0 flex items-center justify-center">
                  <span class="text-[8px]">${fullTokenInfo.token.symbol.slice(0, 3)}</span>
                </div>
                <span class="text-gray-400 truncate" title="${token}">
                  ${fullTokenInfo.token.symbol}
                </span>
              </div>
              <span class="text-red-400 ml-2 flex-shrink-0">
                -${CurrencyAmount.fromUnscaled(amount, fullTokenInfo.token).toString()}
              </span>
            </div>
          `;
        }
      }
      content += '</div>';
    } else {
      content += '<div class="text-gray-600">No outflows</div>';
    }

    content += `
        </div>
      </div>
    `;

    return content;
  }

  // Share function for position data
  function openShareWidget(positionData: HistoricalPosition) {
    const coordinates = locationToCoordinates(positionData.land_location);
    widgetsStore.addWidget({
      id: `share-${positionData.land_location}-${Date.now()}`,
      type: 'share',
      position: {
        x: window.innerWidth / 2 - 187.5,
        y: window.innerHeight / 2 - 333.5,
      },
      dimensions: { width: 375, height: 0 },
      isMinimized: false,
      isOpen: true,
      data: {
        position: positionData,
        coordinates: coordinates,
      },
    });
  }

  // Expose share function globally for use in HTML
  if (typeof window !== 'undefined') {
    (window as any).sharePosition = (positionId: string) => {
      const position = filteredPositions.find((p) => p.id === positionId);
      if (position) {
        openShareWidget(position);
      }
    };
  }
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
    {:else if filteredPositions.length === 0}
      <div class="text-center py-8 text-gray-400">
        No positions found for the selected time period
      </div>
    {:else}
      <DataTable
        data={filteredPositions}
        {columns}
        expandedContent={generateExpandedContent}
      />
    {/if}
  </ScrollArea>
</div>
