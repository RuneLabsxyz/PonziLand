<script lang="ts">
  import { ChevronDown, ChevronUp } from 'lucide-svelte';
  import { formatAddress } from '../leaderboard/helpers';
  import { usernamesStore } from '$lib/stores/account.store.svelte';
  import account from '$lib/account.svelte';
  import { padAddress } from '$lib/utils';
  import type { LeaderboardEntry, RankingMode } from './tournament.service';
  import PositionRow from './cells/position-row.svelte';

  interface Props {
    entries: LeaderboardEntry[];
    rankingMode: RankingMode;
  }

  let { entries, rankingMode }: Props = $props();

  // Track which rows are expanded
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

  function formatPnL(value: number): string {
    const isPositive = value >= 0;
    const formatted = Math.abs(value).toFixed(2);
    return `${isPositive ? '+' : '-'}$${formatted}`;
  }

  function getPnLColorClass(value: number): string {
    if (value > 0) return 'text-green-400';
    if (value < 0) return 'text-red-400';
    return 'text-gray-400';
  }

  function getDisplayPnL(entry: LeaderboardEntry): number {
    return rankingMode === 'best'
      ? (entry.bestPnL ?? 0)
      : (entry.totalPnL ?? 0);
  }
</script>

<div class="flex flex-col h-full">
  <!-- Header -->
  <div
    class="grid grid-cols-[40px_1fr_100px_70px] gap-2 px-3 py-2 bg-gray-800/50 text-xs text-gray-400 font-medium border-b border-gray-700"
  >
    <div class="text-center">#</div>
    <div>Player</div>
    <div class="text-right">
      {rankingMode === 'best' ? 'Best PnL' : 'Total PnL'}
    </div>
    <div class="text-center">Lands</div>
  </div>

  <!-- Entries -->
  <div class="flex-1 overflow-auto">
    {#each entries as entry, index}
      {@const isExpanded = expandedRows.has(entry.owner)}
      {@const isUser = isCurrentUser(entry.owner)}
      {@const displayPnL = getDisplayPnL(entry)}

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
          <span class="truncate" title={entry.owner}>
            {getDisplayName(entry.owner)}
          </span>
          {#if isUser}
            <span
              class="text-[10px] bg-purple-600 text-white px-1.5 py-0.5 rounded"
            >
              You
            </span>
          {/if}
        </div>

        <!-- PnL -->
        <div
          class="text-right font-ponzi-number tracking-wider {getPnLColorClass(
            displayPnL,
          )}"
        >
          {formatPnL(displayPnL)}
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
        <div class="bg-gray-900/50 border-b border-gray-700">
          <!-- Positions Header -->
          <div
            class="grid grid-cols-[60px_70px_90px_90px_90px_90px_90px] gap-1 px-3 py-1.5 text-[10px] text-gray-500 border-b border-gray-700/50"
          >
            <div>Location</div>
            <div>Status</div>
            <div class="text-right">PnL</div>
            <div class="text-right">Buy Cost</div>
            <div class="text-right">Sold For</div>
            <div class="text-right">Inflows</div>
            <div class="text-right">Outflows</div>
          </div>

          <!-- Position Rows -->
          {#each entry.positions as position}
            <PositionRow {position} />
          {/each}
        </div>
      {/if}
    {/each}
  </div>
</div>
