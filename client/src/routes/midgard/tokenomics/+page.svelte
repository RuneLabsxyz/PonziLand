<script lang="ts">
  import { midgardGame } from '$lib/midgard/game-state.svelte';
  import { formatTime } from '$lib/midgard/formulas';
  import { LineChart } from 'layerchart';

  // Derived supply history data
  let supplyData = $derived(midgardGame.supplyHistory);
  let tokenEvents = $derived(midgardGame.tokenEvents);

  // Compute y-domain for supply chart
  let supplyYDomain = $derived.by(() => {
    if (supplyData.length === 0) return [0, 2500];
    let max = 0;
    for (const d of supplyData) {
      max = Math.max(max, d.totalSupply, d.circulatingSupply + d.lockedSupply);
    }
    return [0, max * 1.1];
  });

  // Pie chart data for token distribution
  let pieData = $derived([
    {
      label: 'Tycoon',
      value: midgardGame.tycoonBalance,
      color: 'hsl(270 60% 60%)',
    },
    {
      label: 'Challenger',
      value: midgardGame.challengerBalance,
      color: 'hsl(30 90% 55%)',
    },
    {
      label: 'Locked (Vault)',
      value: midgardGame.vaultBalance,
      color: 'hsl(45 93% 47%)',
    },
    {
      label: 'Burned',
      value: midgardGame.burnBalance,
      color: 'hsl(0 84% 60%)',
    },
  ]);
</script>

<div class="min-h-screen bg-[#1a1a2e] p-6 text-white">
  <!-- Header -->
  <div class="mb-6 flex items-center justify-between">
    <div>
      <h1 class="font-ponzi-number text-3xl">TOKENOMICS</h1>
      <p class="text-sm text-gray-500">$GARD Supply & Flow Analytics</p>
    </div>
    <div class="flex items-center gap-4">
      <div class="text-right">
        <span class="text-sm text-gray-400">Game Time</span>
        <div class="font-ponzi-number text-lg">
          {formatTime(midgardGame.simulationTime)}
        </div>
      </div>
      <a
        href="/midgard"
        class="rounded bg-gray-700 px-4 py-2 text-sm font-medium hover:bg-gray-600"
      >
        Back to Simulation
      </a>
    </div>
  </div>

  <!-- Key Metrics -->
  <div class="mb-6 grid grid-cols-4 gap-4">
    <div class="rounded-lg bg-black/40 p-4">
      <div class="text-sm text-gray-400">Starting Supply</div>
      <div class="font-ponzi-number text-2xl text-gray-300">
        {midgardGame.startingSupply.toFixed(2)}
      </div>
    </div>
    <div class="rounded-lg bg-black/40 p-4">
      <div class="text-sm text-gray-400">Total Supply</div>
      <div class="font-ponzi-number text-2xl text-blue-400">
        {midgardGame.totalSupply.toFixed(2)}
      </div>
    </div>
    <div class="rounded-lg bg-black/40 p-4">
      <div class="text-sm text-gray-400">Total Minted</div>
      <div class="font-ponzi-number text-2xl text-green-400">
        +{midgardGame.totalMinted.toFixed(2)}
      </div>
    </div>
    <div class="rounded-lg bg-black/40 p-4">
      <div class="text-sm text-gray-400">Total Burned</div>
      <div class="font-ponzi-number text-2xl text-red-400">
        -{midgardGame.totalBurned.toFixed(2)}
      </div>
    </div>
  </div>

  <!-- Supply Breakdown -->
  <div class="mb-6 grid grid-cols-3 gap-4">
    <div class="rounded-lg bg-black/40 p-4">
      <div class="text-sm text-gray-400">Circulating Supply</div>
      <div class="font-ponzi-number text-xl text-cyan-400">
        {midgardGame.circulatingSupply.toFixed(2)}
      </div>
      <div class="mt-1 text-xs text-gray-500">Tycoon + Challenger balances</div>
    </div>
    <div class="rounded-lg bg-black/40 p-4">
      <div class="text-sm text-gray-400">Locked in Vault</div>
      <div class="font-ponzi-number text-xl text-yellow-400">
        {midgardGame.vaultBalance.toFixed(2)}
      </div>
      <div class="mt-1 text-xs text-gray-500">Factory stakes</div>
    </div>
    <div class="rounded-lg bg-black/40 p-4">
      <div class="text-sm text-gray-400">Net Inflation</div>
      <div
        class={[
          'font-ponzi-number text-xl',
          {
            'text-green-400': midgardGame.netInflation >= 0,
            'text-red-400': midgardGame.netInflation < 0,
          },
        ]}
      >
        {midgardGame.netInflation >= 0
          ? '+'
          : ''}{midgardGame.netInflation.toFixed(2)}
      </div>
      <div class="mt-1 text-xs text-gray-500">Minted - Burned</div>
    </div>
  </div>

  <!-- Player Balances -->
  <div class="mb-6 grid grid-cols-2 gap-4">
    <div class="rounded-lg bg-purple-500/20 p-4">
      <div class="flex items-center gap-2">
        <div class="h-3 w-3 rounded-full bg-purple-500"></div>
        <span class="text-sm text-purple-400">Tycoon Balance</span>
      </div>
      <div class="font-ponzi-number text-2xl text-purple-300">
        {midgardGame.tycoonBalance.toFixed(2)}
      </div>
      <div class="mt-1 text-xs text-gray-500">Factory owner</div>
    </div>
    <div class="rounded-lg bg-orange-500/20 p-4">
      <div class="flex items-center gap-2">
        <div class="h-3 w-3 rounded-full bg-orange-500"></div>
        <span class="text-sm text-orange-400">Challenger Balance</span>
      </div>
      <div class="font-ponzi-number text-2xl text-orange-300">
        {midgardGame.challengerBalance.toFixed(2)}
      </div>
      <div class="mt-1 text-xs text-gray-500">Factory challenger</div>
    </div>
  </div>

  <!-- Charts Section -->
  <div class="mb-6 grid grid-cols-2 gap-4">
    <!-- Supply Over Time Chart -->
    <div class="rounded-lg bg-black/40 p-4">
      <h3 class="mb-3 text-lg text-blue-400">Supply Over Time</h3>
      {#if supplyData.length > 1}
        <div class="h-64 stroke-white">
          <LineChart
            data={supplyData}
            x="time"
            y="totalSupply"
            yDomain={supplyYDomain}
            series={[
              {
                key: 'totalSupply',
                label: 'Total Supply',
                color: 'hsl(217 91% 60%)',
              },
              {
                key: 'circulatingSupply',
                label: 'Circulating',
                color: 'hsl(174 72% 56%)',
              },
              {
                key: 'lockedSupply',
                label: 'Locked',
                color: 'hsl(45 93% 47%)',
              },
            ]}
            props={{
              xAxis: {
                format: (v: number) => formatTime(v),
                class: 'text-white',
              },
              yAxis: {
                format: (v: number) => v.toFixed(0),
                class: 'text-white',
              },
            }}
          />
        </div>
        <div class="mt-2 flex justify-center gap-4 text-xs">
          <div class="flex items-center gap-1">
            <div class="h-2 w-4 rounded bg-blue-500"></div>
            <span class="text-gray-400">Total</span>
          </div>
          <div class="flex items-center gap-1">
            <div class="h-2 w-4 rounded bg-cyan-500"></div>
            <span class="text-gray-400">Circulating</span>
          </div>
          <div class="flex items-center gap-1">
            <div class="h-2 w-4 rounded bg-yellow-500"></div>
            <span class="text-gray-400">Locked</span>
          </div>
        </div>
      {:else}
        <div class="flex h-64 items-center justify-center text-gray-500">
          Run the simulation to see supply changes over time
        </div>
      {/if}
    </div>

    <!-- Token Distribution -->
    <div class="rounded-lg bg-black/40 p-4">
      <h3 class="mb-3 text-lg text-green-400">Token Distribution</h3>
      <div class="space-y-3">
        {#each pieData as item}
          {@const total =
            midgardGame.tycoonBalance +
            midgardGame.challengerBalance +
            midgardGame.vaultBalance +
            midgardGame.burnBalance}
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
              <span class="font-ponzi-number">{item.value.toFixed(2)}</span>
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
      <div class="mt-4 border-t border-gray-700 pt-3">
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-400">Total Accounted:</span>
          <span class="font-ponzi-number">
            {(
              midgardGame.tycoonBalance +
              midgardGame.challengerBalance +
              midgardGame.vaultBalance +
              midgardGame.burnBalance
            ).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  </div>

  <!-- Token Events History -->
  <div class="rounded-lg bg-black/40 p-4">
    <h3 class="mb-3 text-lg text-orange-400">Token Events History</h3>
    {#if tokenEvents.length > 0}
      <div class="max-h-64 overflow-y-auto">
        <table class="w-full text-sm">
          <thead class="sticky top-0 bg-black/60">
            <tr class="text-gray-500">
              <th class="py-2 text-left">Time</th>
              <th class="py-2 text-left">Type</th>
              <th class="py-2 text-right">Amount</th>
              <th class="py-2 text-left">Source</th>
              <th class="py-2 text-left">Description</th>
            </tr>
          </thead>
          <tbody>
            {#each [...tokenEvents].reverse() as event}
              <tr class="border-t border-gray-800">
                <td class="py-2 font-ponzi-number">{formatTime(event.time)}</td>
                <td class="py-2">
                  <span
                    class={[
                      'rounded px-2 py-0.5 text-xs font-bold',
                      {
                        'bg-yellow-500/20 text-yellow-400':
                          event.type === 'LOCK',
                        'bg-green-500/20 text-green-400': event.type === 'MINT',
                        'bg-red-500/20 text-red-400': event.type === 'BURN',
                      },
                    ]}
                  >
                    {event.type}
                  </span>
                </td>
                <td
                  class={[
                    'py-2 text-right font-ponzi-number',
                    {
                      'text-yellow-400': event.type === 'LOCK',
                      'text-green-400': event.type === 'MINT',
                      'text-red-400': event.type === 'BURN',
                    },
                  ]}
                >
                  {event.type === 'MINT'
                    ? '+'
                    : event.type === 'BURN'
                      ? '-'
                      : ''}{event.amount.toFixed(2)}
                </td>
                <td class="py-2 text-gray-400">{event.source}</td>
                <td class="py-2 text-gray-500">{event.description}</td>
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

  <!-- Formula Reference -->
  <div class="mt-6 rounded-lg bg-black/20 p-4 text-sm text-gray-400">
    <h3 class="mb-2 font-bold text-white">Token Flow Reference</h3>
    <div class="grid grid-cols-2 gap-4">
      <div>
        <h4 class="mb-1 font-semibold text-purple-400">Token Events</h4>
        <ul class="list-inside list-disc space-y-1">
          <li>
            <strong>LOCK:</strong> Factory creation locks Tycoon tokens to Vault
          </li>
          <li>
            <strong>MINT:</strong> Challenge win mints inflation to Challenger
          </li>
          <li>
            <strong>BURN:</strong> Challenge loss or factory close burns tokens
          </li>
        </ul>
      </div>
      <div>
        <h4 class="mb-1 font-semibold text-blue-400">Supply Formulas</h4>
        <ul class="list-inside list-disc space-y-1">
          <li>
            <strong>Total Supply:</strong> Starting + Minted - Burned
          </li>
          <li>
            <strong>Circulating:</strong> Tycoon + Challenger balances
          </li>
          <li>
            <strong>Net Inflation:</strong> Total Minted - Total Burned
          </li>
        </ul>
      </div>
    </div>
  </div>
</div>
