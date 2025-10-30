<script lang="ts">
  import { locationToCoordinates } from '$lib/utils';
  import type {
    HistoricalPosition,
    TokenFlow,
  } from './historical-positions.service';
  import { ChevronDown, ChevronUp } from 'lucide-svelte';

  interface Props {
    position: HistoricalPosition;
  }

  let { position }: Props = $props();
  let expanded = $state(false);

  function toggleExpanded() {
    expanded = !expanded;
  }

  // Convert hex string to number and format
  function formatTokenAmount(hexAmount: string | null): string {
    if (!hexAmount) return '0';

    try {
      const num = BigInt(hexAmount);
      const decimals = 18; // Assuming 18 decimals, adjust if needed
      const divisor = BigInt(10 ** decimals);
      const whole = num / divisor;
      const remainder = num % divisor;

      // Format with 4 decimal places
      const decimal = remainder.toString().padStart(decimals, '0').slice(0, 4);
      return `${whole}.${decimal}`;
    } catch {
      return '0';
    }
  }

  function formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  }

  function getStatusColor(reason: string): string {
    switch (reason) {
      case 'bought':
        return 'text-green-400';
      case 'nuked':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  }

  function getPnLColor(amount: string | null): string {
    if (!amount) return 'text-gray-400';
    return amount.startsWith('-') ? 'text-red-400' : 'text-green-400';
  }

  const coordinates = $derived(locationToCoordinates(position.land_location));
  const isAuctionBuy = $derived(position.buy_token_used === null);
</script>

<div class="position-entry border-b border-gray-800/50">
  <!-- Main Row -->
  <button
    class="w-full px-4 py-3 hover:bg-white/5 transition-colors"
    onclick={toggleExpanded}
  >
    <div class="grid grid-cols-7 gap-2 text-sm items-center">
      <div class="flex items-center gap-2">
        <span class="text-gray-300">({coordinates.x}, {coordinates.y})</span>
        {#if expanded}
          <ChevronUp size={14} class="text-gray-500" />
        {:else}
          <ChevronDown size={14} class="text-gray-500" />
        {/if}
      </div>
      <div class="text-xs text-gray-400">
        {formatDate(position.time_bought)}
      </div>
      <div class="text-xs text-gray-400">{formatDate(position.close_date)}</div>
      <div class="text-xs {getStatusColor(position.close_reason)}">
        {position.close_reason.toUpperCase()}
        {#if isAuctionBuy}
          <span class="text-gray-500 ml-1">(auction)</span>
        {/if}
      </div>
      <div class="text-right text-xs">
        {formatTokenAmount(position.buy_cost_token)}
      </div>
      <div class="text-right text-xs">
        {position.sale_revenue_token
          ? formatTokenAmount(position.sale_revenue_token)
          : '-'}
      </div>
      <div class="text-right text-xs {getPnLColor(position.net_profit_token)}">
        {position.net_profit_token
          ? formatTokenAmount(position.net_profit_token)
          : '-'}
      </div>
    </div>
  </button>

  <!-- Expanded Details -->
  {#if expanded}
    <div class="px-4 pb-4 bg-black/20">
      <div class="grid grid-cols-2 gap-4 mt-2">
        <!-- Token Inflows -->
        <div>
          <h4 class="text-xs text-gray-400 mb-2">Token Inflows</h4>
          {#if Object.keys(position.token_inflows).length > 0}
            <div class="space-y-1">
              {#each Object.entries(position.token_inflows) as [token, amount]}
                <div class="text-xs flex justify-between">
                  <span
                    class="text-gray-500 truncate max-w-[150px]"
                    title={token}
                  >
                    0x{token.slice(3, 6)}...{token.slice(-4)}
                  </span>
                  <span class="text-green-400 ml-2"
                    >{formatTokenAmount(amount)}</span
                  >
                </div>
              {/each}
            </div>
          {:else}
            <div class="text-xs text-gray-600">No inflows</div>
          {/if}
        </div>

        <!-- Token Outflows -->
        <div>
          <h4 class="text-xs text-gray-400 mb-2">Token Outflows</h4>
          {#if Object.keys(position.token_outflows).length > 0}
            <div class="space-y-1">
              {#each Object.entries(position.token_outflows) as [token, amount]}
                <div class="text-xs flex justify-between">
                  <span
                    class="text-gray-500 truncate max-w-[150px]"
                    title={token}
                  >
                    0x{token.slice(3, 6)}...{token.slice(-4)}
                  </span>
                  <span class="text-red-400 ml-2"
                    >{formatTokenAmount(amount)}</span
                  >
                </div>
              {/each}
            </div>
          {:else}
            <div class="text-xs text-gray-600">No outflows</div>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .position-entry {
    transition: all 0.2s ease;
  }
</style>
