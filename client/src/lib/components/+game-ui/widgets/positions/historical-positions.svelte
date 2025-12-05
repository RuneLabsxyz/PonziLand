<script lang="ts">
  import Button from '$lib/components/ui/button/button.svelte';
  import { ScrollArea } from '$lib/components/ui/scroll-area';
  import { useDojo } from '$lib/contexts/dojo';
  import { padAddress } from '$lib/utils';
  import { onMount } from 'svelte';
  import type { ColumnFiltersState } from '@tanstack/table-core';
  import DataTable from './data-table.svelte';
  import { columns } from './historical-positions-columns';
  import {
    fetchHistoricalPositions,
    type HistoricalPosition,
  } from './historical-positions.service';
  import account from '$lib/account.svelte';

  const { accountManager: dojoAccountManager } = useDojo();

  let positions = $state<HistoricalPosition[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let refreshInterval: NodeJS.Timeout;
  let timePeriod = $state<'1D' | '1W' | '1M' | '1Y' | 'ALL'>('ALL');
  let columnFilters = $state<ColumnFiltersState>([]);

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

  async function loadPositions() {
    try {
      const currentAccount = account.walletAccount;
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
  <div class="w-full flex justify-end p-2">
    <div class="flex">
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
      {:else}
        <DataTable data={positions} {columns} bind:columnFilters />
      {/if}
    </ScrollArea>
  </div>
{/if}
