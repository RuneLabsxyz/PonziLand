<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as api from '$lib/midgard/api-client';
  import type { SupplyStats, TokenEvent } from '$lib/midgard/api-client';

  // State
  let supplyStats = $state<SupplyStats | null>(null);
  let tokenEvents = $state<TokenEvent[]>([]);
  let isLoading = $state(true);
  let error = $state<string | null>(null);
  let lastUpdated = $state<Date | null>(null);

  // Refresh interval
  let refreshInterval: ReturnType<typeof setInterval> | null = null;

  // Fetch data
  async function fetchData() {
    try {
      const [stats, events] = await Promise.all([
        api.getSupplyStats(),
        api.getTokenEvents(100),
      ]);
      supplyStats = stats;
      tokenEvents = events;
      lastUpdated = new Date();
      error = null;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to fetch data';
      console.error('Tokenomics fetch error:', e);
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    fetchData();
    // Refresh every 5 seconds
    refreshInterval = setInterval(fetchData, 5000);
  });

  onDestroy(() => {
    if (refreshInterval) clearInterval(refreshInterval);
  });

  // Distribution data for visualization
  let distributionData = $derived(
    supplyStats
      ? [
          {
            label: 'Circulating',
            value: supplyStats.totalCirculating,
            color: 'hsl(174 72% 56%)',
          },
          {
            label: 'Locked',
            value: supplyStats.totalLocked,
            color: 'hsl(45 93% 47%)',
          },
          {
            label: 'Burned',
            value: supplyStats.totalBurned,
            color: 'hsl(0 84% 60%)',
          },
        ]
      : [],
  );

  // Format date for display
  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleTimeString();
  }

  // Get event type color class
  function getEventTypeClass(type: string): {
    bg: string;
    text: string;
    amount: string;
  } {
    switch (type) {
      case 'MINT':
        return {
          bg: 'bg-green-500/20',
          text: 'text-green-400',
          amount: 'text-green-400',
        };
      case 'BURN':
        return {
          bg: 'bg-red-500/20',
          text: 'text-red-400',
          amount: 'text-red-400',
        };
      case 'LOCK':
        return {
          bg: 'bg-yellow-500/20',
          text: 'text-yellow-400',
          amount: 'text-yellow-400',
        };
      case 'UNLOCK':
        return {
          bg: 'bg-blue-500/20',
          text: 'text-blue-400',
          amount: 'text-blue-400',
        };
      default:
        return {
          bg: 'bg-gray-500/20',
          text: 'text-gray-400',
          amount: 'text-gray-400',
        };
    }
  }
</script>

<div class="min-h-screen p-6 text-white">
  <!-- Header -->
  <div class="mb-6 flex items-center justify-between">
    <div>
      <h1 class="font-ponzi-number text-3xl">TOKENOMICS</h1>
      <p class="text-sm text-gray-500">$GARD Supply & Flow Analytics (API)</p>
    </div>
    <div class="flex items-center gap-4">
      {#if lastUpdated}
        <div class="text-right">
          <span class="text-sm text-gray-400">Last Updated</span>
          <div class="text-sm text-gray-300">
            {lastUpdated.toLocaleTimeString()}
          </div>
        </div>
      {/if}
      <a
        href="/midgard"
        class="rounded bg-gray-700 px-4 py-2 text-sm font-medium hover:bg-gray-600"
      >
        Back to Main
      </a>
      <a
        href="/midgard/simulation/tokenomics"
        class="rounded bg-purple-700 px-4 py-2 text-sm font-medium hover:bg-purple-600"
      >
        Simulation Mode
      </a>
    </div>
  </div>

  {#if isLoading}
    <div class="flex h-64 items-center justify-center">
      <p class="text-gray-400">Loading tokenomics data...</p>
    </div>
  {:else if error}
    <div class="mb-6 rounded-lg bg-red-500/20 p-4 text-red-400">
      Error: {error}
    </div>
  {:else if supplyStats}
    <!-- Key Metrics -->
    <div class="mb-6 grid grid-cols-4 gap-4">
      <div class="rounded-lg bg-black/40 p-4">
        <div class="text-sm text-gray-400">Net Supply</div>
        <div class="font-ponzi-number text-2xl text-blue-400">
          {supplyStats.netSupply.toFixed(2)}
        </div>
        <div class="mt-1 text-xs text-gray-500">Minted - Burned</div>
      </div>
      <div class="rounded-lg bg-black/40 p-4">
        <div class="text-sm text-gray-400">Total Minted</div>
        <div class="font-ponzi-number text-2xl text-green-400">
          +{supplyStats.totalMinted.toFixed(2)}
        </div>
      </div>
      <div class="rounded-lg bg-black/40 p-4">
        <div class="text-sm text-gray-400">Total Burned</div>
        <div class="font-ponzi-number text-2xl text-red-400">
          -{supplyStats.totalBurned.toFixed(2)}
        </div>
      </div>
      <div class="rounded-lg bg-black/40 p-4">
        <div class="text-sm text-gray-400">Net Inflation</div>
        <div
          class={[
            'font-ponzi-number text-2xl',
            {
              'text-green-400':
                supplyStats.totalMinted - supplyStats.totalBurned >= 0,
              'text-red-400':
                supplyStats.totalMinted - supplyStats.totalBurned < 0,
            },
          ]}
        >
          {supplyStats.totalMinted - supplyStats.totalBurned >= 0 ? '+' : ''}
          {(supplyStats.totalMinted - supplyStats.totalBurned).toFixed(2)}
        </div>
      </div>
    </div>

    <!-- Supply Breakdown -->
    <div class="mb-6 grid grid-cols-2 gap-4">
      <div class="rounded-lg bg-black/40 p-4">
        <div class="text-sm text-gray-400">Circulating Supply</div>
        <div class="font-ponzi-number text-xl text-cyan-400">
          {supplyStats.totalCirculating.toFixed(2)}
        </div>
        <div class="mt-1 text-xs text-gray-500">Available in wallets</div>
      </div>
      <div class="rounded-lg bg-black/40 p-4">
        <div class="text-sm text-gray-400">Locked in Factories</div>
        <div class="font-ponzi-number text-xl text-yellow-400">
          {supplyStats.totalLocked.toFixed(2)}
        </div>
        <div class="mt-1 text-xs text-gray-500">Factory stakes</div>
      </div>
    </div>

    <!-- Token Distribution -->
    <div class="mb-6 rounded-lg bg-black/40 p-4">
      <h3 class="mb-3 text-lg text-green-400">Token Distribution</h3>
      <div class="space-y-3">
        {#each distributionData as item}
          {@const total =
            supplyStats.totalCirculating +
            supplyStats.totalLocked +
            supplyStats.totalBurned}
          {@const percent = total > 0 ? (item.value / total) * 100 : 0}
          <div>
            <div class="mb-1 flex items-center justify-between text-sm">
              <div class="flex items-center gap-2">
                <div
                  class="h-3 w-3 rounded-full"
                  style="background-color: {item.color}"
                ></div>
                <span class="text-gray-400">{item.label}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="font-ponzi-number">{item.value.toFixed(2)}</span>
                <span class="text-xs text-gray-500"
                  >({percent.toFixed(1)}%)</span
                >
              </div>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-gray-700">
              <div
                class="h-full transition-all"
                style="width: {percent}%; background-color: {item.color}"
              ></div>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Token Events History -->
    <div class="rounded-lg bg-black/40 p-4">
      <h3 class="mb-3 text-lg text-orange-400">Recent Token Events</h3>
      {#if tokenEvents.length > 0}
        <div class="max-h-96 overflow-y-auto">
          <table class="w-full text-sm">
            <thead class="sticky top-0 bg-black/80">
              <tr class="text-gray-500">
                <th class="py-2 text-left">Time</th>
                <th class="py-2 text-left">Type</th>
                <th class="py-2 text-right">Amount</th>
                <th class="py-2 text-left">Wallet</th>
                <th class="py-2 text-left">Source</th>
                <th class="py-2 text-left">Description</th>
              </tr>
            </thead>
            <tbody>
              {#each tokenEvents as event}
                {@const typeClass = getEventTypeClass(event.eventType)}
                <tr class="border-t border-gray-800">
                  <td class="py-2 font-ponzi-number text-gray-400">
                    {formatDate(event.createdAt)}
                  </td>
                  <td class="py-2">
                    <span
                      class={[
                        'rounded px-2 py-0.5 text-xs font-bold',
                        typeClass.bg,
                        typeClass.text,
                      ]}
                    >
                      {event.eventType}
                    </span>
                  </td>
                  <td
                    class={[
                      'py-2 text-right font-ponzi-number',
                      typeClass.amount,
                    ]}
                  >
                    {event.eventType === 'MINT'
                      ? '+'
                      : event.eventType === 'BURN'
                        ? '-'
                        : ''}{event.amount.toFixed(2)}
                  </td>
                  <td
                    class="py-2 text-gray-400 truncate max-w-24"
                    title={event.walletAddress}
                  >
                    {event.walletAddress.slice(0, 12)}...
                  </td>
                  <td class="py-2 text-gray-400">{event.source}</td>
                  <td
                    class="py-2 text-gray-500 truncate max-w-48"
                    title={event.description}
                  >
                    {event.description || '-'}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {:else}
        <div class="py-8 text-center text-gray-500">
          No token events yet. Create factories and challenge them to see token
          flow.
        </div>
      {/if}
    </div>
  {/if}

  <!-- Formula Reference -->
  <div class="mt-6 rounded-lg bg-black/20 p-4 text-sm text-gray-400">
    <h3 class="mb-2 font-bold text-white">Token Flow Reference</h3>
    <div class="grid grid-cols-2 gap-4">
      <div>
        <h4 class="mb-1 font-semibold text-purple-400">Token Events</h4>
        <ul class="list-inside list-disc space-y-1">
          <li>
            <strong>LOCK:</strong> Factory creation locks tokens to vault
          </li>
          <li>
            <strong>MINT:</strong> Challenge win mints inflation reward
          </li>
          <li>
            <strong>BURN:</strong> Challenge loss or factory close burns tokens
          </li>
          <li>
            <strong>UNLOCK:</strong> Factory close returns remaining stake
          </li>
        </ul>
      </div>
      <div>
        <h4 class="mb-1 font-semibold text-blue-400">Supply Formulas</h4>
        <ul class="list-inside list-disc space-y-1">
          <li>
            <strong>Net Supply:</strong> Total Minted - Total Burned
          </li>
          <li>
            <strong>Circulating:</strong> Available in wallet balances
          </li>
          <li>
            <strong>Locked:</strong> Staked in active factories
          </li>
        </ul>
      </div>
    </div>
  </div>
</div>
