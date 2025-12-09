<script lang="ts">
  import Button from '$lib/components/ui/button/button.svelte';
  import { ScrollArea } from '$lib/components/ui/scroll-area';
  import { useDojo } from '$lib/contexts/dojo';
  import { padAddress } from '$lib/utils';
  import { onMount } from 'svelte';
  import type {
    ColumnFiltersState,
    VisibilityState,
  } from '@tanstack/table-core';
  import DataTable from './data-table.svelte';
  import {
    DataTableColumnVisibility,
    DataTableFilter,
  } from '$lib/components/ui/data-table';
  import { columns } from './historical-positions-columns';
  import {
    fetchHistoricalPositions,
    type HistoricalPosition,
  } from './historical-positions.service';
  import account from '$lib/account.svelte';

  const { accountManager: dojoAccountManager } = useDojo();

  let positionsPromise = $state<Promise<HistoricalPosition[]> | null>(null);
  let refreshInterval: NodeJS.Timeout;
  let timePeriod = $state<'1D' | '1W' | '1M' | '1Y' | 'ALL'>('ALL');
  let columnFilters = $state<ColumnFiltersState>([]);
  let columnVisibility = $state<VisibilityState>({});

  // Function to update the time period filter
  function setTimePeriodFilter(period: '1D' | '1W' | '1M' | '1Y' | 'ALL') {
    timePeriod = period;

    // Update the column filter for time_bought column
    const existingFilters = columnFilters.filter(
      (filter) => filter.id !== 'time_bought',
    );

    if (period === 'ALL') {
      columnFilters = existingFilters;
    } else {
      columnFilters = [
        ...existingFilters,
        { id: 'time_bought', value: period },
      ];
    }
  }

  function loadPositions(): Promise<HistoricalPosition[]> {
    const currentAccount = account.walletAccount;
    if (!currentAccount) {
      return Promise.reject(new Error('No wallet account available'));
    }

    const userAddress = padAddress(currentAccount.address)!;
    return fetchHistoricalPositions(userAddress);
  }

  function refreshPositions() {
    positionsPromise = loadPositions();
  }

  onMount(() => {
    refreshPositions();

    // Refresh every 60 seconds
    refreshInterval = setInterval(refreshPositions, 60000);

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  });
</script>

{#if !account.isConnected}
  <!-- Wallet connection prompt -->
  <div class="flex flex-col items-center justify-center gap-4 p-8">
    <div class="text-center tracking-wide">
      <p class="opacity-75 text-xl">
        To see your positions please connect your wallet.
      </p>
    </div>
    <Button
      class=""
      onclick={async () => {
        await dojoAccountManager?.promptForLogin();
      }}
    >
      CONNECT WALLET
    </Button>
  </div>
{:else}
  <!-- Time period filter will be moved to DataTableFilter component -->
  <div class="flex flex-col h-full min-h-0">
    {#if positionsPromise}
      {#await positionsPromise}
        <div class="text-center py-8 text-gray-400">Loading positions...</div>
      {:then positions}
        {#if positions.length === 0}
          <div class="text-center py-8 text-gray-400">
            No historical positions yet
          </div>
        {:else}
          <DataTable
            data={positions}
            {columns}
            bind:columnFilters
            bind:columnVisibility
          >
        {#snippet toolbar(table)}
          <DataTableFilter {table}>
            {#snippet customFilters()}
              <div class="flex gap-1">
                <Button
                  size="md"
                  variant={timePeriod === '1D' ? 'blue' : 'red'}
                  onclick={() => setTimePeriodFilter('1D')}
                >
                  1D
                </Button>
                <Button
                  size="md"
                  variant={timePeriod === '1W' ? 'blue' : 'red'}
                  onclick={() => setTimePeriodFilter('1W')}
                >
                  1W
                </Button>
                <Button
                  size="md"
                  variant={timePeriod === '1M' ? 'blue' : 'red'}
                  onclick={() => setTimePeriodFilter('1M')}
                >
                  1M
                </Button>
                <Button
                  size="md"
                  variant={timePeriod === '1Y' ? 'blue' : 'red'}
                  onclick={() => setTimePeriodFilter('1Y')}
                >
                  1Y
                </Button>
                <Button
                  size="md"
                  variant={timePeriod === 'ALL' ? 'blue' : 'red'}
                  onclick={() => setTimePeriodFilter('ALL')}
                >
                  ALL
                </Button>
              </div>
              <DataTableColumnVisibility {table} />
            {/snippet}
          </DataTableFilter>
        {/snippet}
          </DataTable>
        {/if}
      {:catch error}
        <div class="text-center py-8 text-red-400">
          Error: {error.message}
        </div>
      {/await}
    {:else}
      <div class="text-center py-8 text-gray-400">Loading positions...</div>
    {/if}
  </div>
{/if}
