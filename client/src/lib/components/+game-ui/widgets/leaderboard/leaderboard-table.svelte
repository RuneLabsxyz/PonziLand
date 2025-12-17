<script lang="ts">
  import { ChevronDown, ChevronUp } from 'lucide-svelte';
  import { formatAddress } from './helpers';
  import { usernamesStore } from '$lib/stores/account.store.svelte';
  import account from '$lib/account.svelte';
  import { padAddress, locationToCoordinates } from '$lib/utils';
  import type {
    LeaderboardEntry,
    RankingMode,
    LeaderboardPosition,
    MetricType,
  } from './leaderboard.service';
  import PositionRow from './cells/position-row.svelte';
  import StatusCell from '../positions/cells/status-cell.svelte';
  import TotalPnlCell from '../positions/cells/total-pnl-cell.svelte';
  import CostCell from '../positions/cells/cost-cell.svelte';
  import TokenInflowCell from '../positions/cells/token-inflow-cell.svelte';
  import TokenOutflowCell from '../positions/cells/token-outflow-cell.svelte';
  import DateCell from '../positions/cells/date-cell.svelte';
  import RoiCell from '../positions/cells/roi-cell.svelte';

  interface Props {
    entries: LeaderboardEntry[];
    rankingMode: RankingMode;
    /** Show all columns including buy/sell (true) or simplified view (false) */
    showFullDetails?: boolean;
    /** Cap the number of results displayed */
    limit?: number;
    /** Which metric to use for sorting/display: 'pnl' includes buy/sell, 'tokenFlow' excludes it */
    metricType?: MetricType;
  }

  let {
    entries,
    rankingMode,
    showFullDetails = true,
    limit,
    metricType = 'pnl',
  }: Props = $props();

  // Track which rows are expanded (for total PnL mode)
  let expandedRows = $state<Set<string>>(new Set());

  function toggleRow(owner: string) {
    const newSet = new Set(expandedRows);
    if (newSet.has(owner)) {
      newSet.delete(owner);
    } else {
      newSet.add(owner);
    }
    expandedRows = newSet;
  }

  // Get the display value for an entry based on metric type
  function getEntryDisplayValue(entry: LeaderboardEntry): number {
    if (metricType === 'tokenFlow') {
      return entry.totalTokenFlow ?? 0;
    }
    return entry.totalPnL ?? 0;
  }

  // Get the display value for a position based on metric type
  function getPositionDisplayValue(position: LeaderboardPosition): number {
    if (metricType === 'tokenFlow') {
      return position.metrics?.netTokenFlow?.rawValue().toNumber() ?? -Infinity;
    }
    return position.metrics?.totalPnL?.rawValue().toNumber() ?? -Infinity;
  }

  // For "total" mode: entries sorted by aggregate value
  const sortedEntriesByTotal = $derived.by(() => {
    const sorted = [...entries].sort(
      (a, b) => getEntryDisplayValue(b) - getEntryDisplayValue(a),
    );
    return limit ? sorted.slice(0, limit) : sorted;
  });

  // For "best" mode: flatten ALL positions and sort by individual value
  const allPositionsSorted = $derived.by(() => {
    const positions: Array<{
      owner: string;
      position: LeaderboardPosition;
      displayValue: number;
    }> = [];

    for (const entry of entries) {
      for (const pos of entry.positions) {
        positions.push({
          owner: entry.owner,
          position: pos,
          displayValue: getPositionDisplayValue(pos),
        });
      }
    }

    // Sort by value (highest first)
    positions.sort((a, b) => b.displayValue - a.displayValue);

    return limit ? positions.slice(0, limit) : positions;
  });

  function isCurrentUser(owner: string): boolean {
    if (!account.walletAccount?.address) return false;
    const userAddress = padAddress(account.walletAccount.address);
    const ownerAddress = padAddress(owner);
    return userAddress === ownerAddress;
  }

  function getDisplayName(owner: string): string {
    const username = usernamesStore.getUsername(owner);
    return username || formatAddress(owner);
  }

  function formatValue(value: number): string {
    const isPositive = value >= 0;
    const formatted = Math.abs(value).toFixed(2);
    return `${isPositive ? '+' : '-'}$${formatted}`;
  }

  function getValueColorClass(value: number): string {
    if (value > 0) return 'text-green-400';
    if (value < 0) return 'text-red-400';
    return 'text-gray-400';
  }

  function getCoordinates(location: number): { x: number; y: number } {
    return locationToCoordinates(location);
  }

  // Grid column definitions
  const fullGridCols =
    'grid-cols-[32px_minmax(70px,1fr)_50px_60px_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr]';
  const simplifiedGridCols =
    'grid-cols-[32px_minmax(80px,1fr)_50px_60px_1fr_1fr_1fr_1fr]';
  const fullExpandedGridCols =
    'grid-cols-[50px_60px_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr]';
  const simplifiedExpandedGridCols = 'grid-cols-[50px_60px_1fr_1fr_1fr_1fr]';
</script>

<div class="flex flex-col h-full">
  {#if rankingMode === 'total'}
    <!-- TOTAL MODE: Expandable player view -->
    <!-- Header -->
    <div
      class="grid grid-cols-[40px_1fr_100px_70px] gap-2 px-3 py-2 bg-gray-800/50 text-xs text-gray-400 font-medium border-b border-gray-700"
    >
      <div class="text-center">#</div>
      <div>Player</div>
      <div class="text-right">Total PnL</div>
      <div class="text-center">Lands</div>
    </div>

    <!-- Entries -->
    <div class="flex-1 overflow-auto">
      {#each sortedEntriesByTotal as entry, index}
        {@const isExpanded = expandedRows.has(entry.owner)}
        {@const isUser = isCurrentUser(entry.owner)}
        {@const displayValue = getEntryDisplayValue(entry)}

        <!-- Player Row -->
        <button
          class="w-full grid grid-cols-[40px_1fr_100px_70px] gap-2 px-3 py-2 items-center text-sm border-b border-gray-700/50 hover:bg-gray-800/30 transition-colors cursor-pointer {isUser
            ? 'bg-purple-900/30'
            : ''}"
          onclick={() => toggleRow(entry.owner)}
        >
          <!-- Rank -->
          <div class="text-center font-ponzi-number">
            {#if index === 0}
              <span class="text-yellow-400">👑</span>
            {:else if index === 1}
              <span class="text-gray-300">🥈</span>
            {:else if index === 2}
              <span class="text-amber-600">🥉</span>
            {:else}
              <span class="text-gray-400">{index + 1}</span>
            {/if}
          </div>

          <!-- Player Name -->
          <div class="flex items-center gap-2 truncate">
            <span class="truncate text-base font-medium" title={entry.owner}>
              {getDisplayName(entry.owner)}
            </span>
            {#if isUser}
              <span
                class="text-xs bg-purple-600 text-white px-1.5 py-0.5 rounded"
              >
                You
              </span>
            {/if}
          </div>

          <!-- Value -->
          <div
            class="text-right font-ponzi-number tracking-wider {getValueColorClass(
              displayValue,
            )}"
          >
            {formatValue(displayValue)}
          </div>

          <!-- Position Count + Expand -->
          <div class="flex items-center justify-center gap-1">
            <span class="text-gray-400">{entry.total_positions}</span>
            {#if isExpanded}
              <ChevronUp size={14} class="text-gray-400" />
            {:else}
              <ChevronDown size={14} class="text-gray-400" />
            {/if}
          </div>
        </button>

        <!-- Expanded Positions -->
        {#if isExpanded}
          <div class="bg-gray-900/50 border-b border-gray-700 overflow-x-auto">
            <!-- Positions Header -->
            {#if showFullDetails}
              <div
                class="grid {fullExpandedGridCols} gap-2 px-3 py-1.5 text-[10px] text-gray-500 border-b border-gray-700/50"
              >
                <div>Location</div>
                <div>Status</div>
                <div class="text-right">PnL</div>
                <div class="text-right">ROI</div>
                <div class="text-right">Bought</div>
                <div class="text-right">Closed</div>
                <div class="text-right">Buy Cost</div>
                <div class="text-right">Sold For</div>
                <div class="text-right">Inflows</div>
                <div class="text-right">Outflows</div>
              </div>
            {:else}
              <div
                class="grid {simplifiedExpandedGridCols} gap-2 px-3 py-1.5 text-[10px] text-gray-500 border-b border-gray-700/50"
              >
                <div>Location</div>
                <div>Status</div>
                <div class="text-right">Bought</div>
                <div class="text-right">Closed</div>
                <div class="text-right">Inflows</div>
                <div class="text-right">Outflows</div>
              </div>
            {/if}

            <!-- Position Rows -->
            {#each entry.positions as position}
              <PositionRow {position} {showFullDetails} />
            {/each}
          </div>
        {/if}
      {/each}
    </div>
  {:else}
    <!-- BEST POSITION MODE: Flat list of ALL positions -->
    <!-- Header -->
    {#if showFullDetails}
      <div
        class="grid {fullGridCols} gap-2 px-3 py-2 bg-gray-800/50 text-[10px] text-gray-400 font-medium border-b border-gray-700"
      >
        <div class="text-center">#</div>
        <div>Player</div>
        <div>Location</div>
        <div>Status</div>
        <div class="text-right">PnL</div>
        <div class="text-right">ROI</div>
        <div class="text-right">Bought</div>
        <div class="text-right">Closed</div>
        <div class="text-right">Buy Cost</div>
        <div class="text-right">Sold For</div>
        <div class="text-right">Inflows</div>
        <div class="text-right">Outflows</div>
      </div>
    {:else}
      <div
        class="grid {simplifiedGridCols} gap-2 px-3 py-2 bg-gray-800/50 text-[10px] text-gray-400 font-medium border-b border-gray-700"
      >
        <div class="text-center">#</div>
        <div>Player</div>
        <div>Location</div>
        <div>Status</div>
        <div class="text-right">Bought</div>
        <div class="text-right">Closed</div>
        <div class="text-right">Inflows</div>
        <div class="text-right">Outflows</div>
      </div>
    {/if}

    <!-- All Positions -->
    <div class="flex-1 overflow-auto">
      {#each allPositionsSorted as { owner, position, displayValue }, index}
        {@const isUser = isCurrentUser(owner)}
        {@const coordinates = getCoordinates(position.land_location)}

        {#if showFullDetails}
          <div
            class={[
              'grid',
              fullGridCols,
              'gap-2 px-3 py-1.5 items-center text-xs border-b border-gray-700/50 hover:bg-gray-800/30 transition-colors',
              { 'bg-purple-900/30': isUser },
            ]}
          >
            <!-- Rank -->
            <div class="text-center font-ponzi-number">
              {#if index === 0}
                <span class="text-yellow-400">👑</span>
              {:else if index === 1}
                <span class="text-gray-300">🥈</span>
              {:else if index === 2}
                <span class="text-amber-600">🥉</span>
              {:else}
                <span class="text-gray-400">{index + 1}</span>
              {/if}
            </div>

            <!-- Player Name -->
            <div class="flex items-center gap-1 truncate">
              <span class="truncate text-base font-medium" title={owner}>
                {getDisplayName(owner)}
              </span>
              {#if isUser}
                <span
                  class="text-xs bg-purple-600 text-white px-1.5 py-0.5 rounded shrink-0"
                >
                  You
                </span>
              {/if}
            </div>

            <!-- Location -->
            <div class="font-ponzi-number text-gray-300">
              ({coordinates.x}, {coordinates.y})
            </div>

            <!-- Status -->
            <div>
              <StatusCell {position} />
            </div>

            <!-- PnL -->
            <div class="flex justify-end">
              <TotalPnlCell
                {position}
                showShareButton={false}
                showPercentage={false}
              />
            </div>

            <!-- ROI -->
            <div class="flex justify-end">
              <RoiCell {position} />
            </div>

            <!-- Bought Date -->
            <div class="flex justify-end">
              <DateCell
                dateString={position.time_bought}
                buyTokenUsed={position.buy_token_used}
                variant="buy"
              />
            </div>

            <!-- Close Date -->
            <div class="flex justify-end">
              <DateCell
                dateString={position.close_date}
                variant="close"
                {position}
              />
            </div>

            <!-- Buy Cost -->
            <div class="flex justify-end">
              <CostCell
                cost={position.buy_cost_token}
                tokenAddress={position.buy_token_used}
                variant="buy"
              />
            </div>

            <!-- Sold For -->
            <div class="flex justify-end">
              {#if position.sale_revenue_token}
                <CostCell
                  cost={position.sale_revenue_token}
                  tokenAddress={position.sale_token_used}
                  variant="sell"
                />
              {:else}
                <span class="text-gray-500">-</span>
              {/if}
            </div>

            <!-- Token Inflows -->
            <div class="flex justify-end">
              <TokenInflowCell {position} />
            </div>

            <!-- Token Outflows -->
            <div class="flex justify-end">
              <TokenOutflowCell {position} />
            </div>
          </div>
        {:else}
          <!-- Simplified view -->
          <div
            class={[
              'grid',
              simplifiedGridCols,
              'gap-2 px-3 py-1.5 items-center text-xs border-b border-gray-700/50 hover:bg-gray-800/30 transition-colors',
              { 'bg-purple-900/30': isUser },
            ]}
          >
            <!-- Rank -->
            <div class="text-center font-ponzi-number">
              {#if index === 0}
                <span class="text-yellow-400">👑</span>
              {:else if index === 1}
                <span class="text-gray-300">🥈</span>
              {:else if index === 2}
                <span class="text-amber-600">🥉</span>
              {:else}
                <span class="text-gray-400">{index + 1}</span>
              {/if}
            </div>

            <!-- Player Name -->
            <div class="flex items-center gap-1 truncate">
              <span class="truncate text-base font-medium" title={owner}>
                {getDisplayName(owner)}
              </span>
              {#if isUser}
                <span
                  class="text-xs bg-purple-600 text-white px-1.5 py-0.5 rounded shrink-0"
                >
                  You
                </span>
              {/if}
            </div>

            <!-- Location -->
            <div class="font-ponzi-number text-gray-300">
              ({coordinates.x}, {coordinates.y})
            </div>

            <!-- Status -->
            <div>
              <StatusCell {position} />
            </div>

            <!-- Bought Date -->
            <div class="flex justify-end">
              <DateCell
                dateString={position.time_bought}
                buyTokenUsed={position.buy_token_used}
                variant="buy"
              />
            </div>

            <!-- Close Date -->
            <div class="flex justify-end">
              <DateCell
                dateString={position.close_date}
                variant="close"
                {position}
              />
            </div>

            <!-- Token Inflows -->
            <div class="flex justify-end">
              <TokenInflowCell {position} />
            </div>

            <!-- Token Outflows -->
            <div class="flex justify-end">
              <TokenOutflowCell {position} />
            </div>
          </div>
        {/if}
      {/each}
    </div>
  {/if}
</div>
