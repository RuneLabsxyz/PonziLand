<script lang="ts">
  import { locationToCoordinates, getTokenMetadata } from '$lib/utils';
  import type {
    HistoricalPosition,
    TokenFlow,
  } from './historical-positions.service';
  import { ChevronDown, ChevronUp } from 'lucide-svelte';
  import * as Avatar from '$lib/components/ui/avatar/index.js';
  import { walletStore } from '$lib/stores/wallet.svelte';
  import data from '$profileData';

  interface Props {
    position: HistoricalPosition;
    isPositionOpen: (position: HistoricalPosition) => boolean;
  }

  let { position, isPositionOpen }: Props = $props();
  let expanded = $state(false);

  const isOpen = $derived(isPositionOpen(position));

  function toggleExpanded() {
    expanded = !expanded;
  }

  // Get token information from address
  function getTokenInfo(address: string) {
    // Try with one leading zero first
    let formattedAddress = address;
    if (address.startsWith('0x')) {
      formattedAddress = '0x0' + address.slice(2);
    }

    let token = data.availableTokens.find(
      (t) => t.address === formattedAddress,
    );

    // If not found, try with two leading zeros
    if (!token && address.startsWith('0x')) {
      formattedAddress = '0x00' + address.slice(2);
      token = data.availableTokens.find((t) => t.address === formattedAddress);
    }

    if (token) {
      const metadata = getTokenMetadata(token.skin);
      return {
        symbol: token.symbol,
        icon: metadata?.icon || '/tokens/default/icon.png',
      };
    }

    return {
      symbol: `0x${address.slice(2, 5)}...${address.slice(-4)}`,
      icon: '/tokens/default/icon.png',
    };
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

<div
  class="position-entry border-b border-gray-800/50 {isOpen
    ? 'bg-green-900/10'
    : ''}"
>
  <!-- Main Row -->
  <button
    class="w-full px-4 py-3 hover:bg-white/5 transition-colors relative"
    onclick={toggleExpanded}
  >
    {#if isOpen}
      <div class="absolute left-0 top-0 bottom-0 w-1 bg-green-400"></div>
    {/if}
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
      <div class="text-xs">
        {#if isOpen}
          <span class="text-green-400 font-semibold">ACTIVE</span>
        {:else}
          <span class={getStatusColor(position.close_reason)}>
            {position.close_reason.toUpperCase()}
          </span>
        {/if}
        {#if isAuctionBuy}
          <span class="text-gray-500 ml-1">(auction)</span>
        {/if}
      </div>
      <div class="text-xs text-gray-400">
        {isOpen ? '-' : formatDate(position.close_date)}
      </div>
      <div class="text-right text-xs">
        <span class="text-white"
          >{formatTokenAmount(position.buy_cost_token)}</span
        >
        <span class="text-gray-500 ml-1">
          {#if position.buy_token_used}
            {@const buyTokenInfo = getTokenInfo(position.buy_token_used)}
            {buyTokenInfo.symbol}
          {:else if isAuctionBuy}
            {data.mainCurrency}
          {:else}
            {data.mainCurrency}
          {/if}
        </span>
      </div>
      <div class="text-right text-xs">
        {#if isOpen}
          <span class="text-gray-500">-</span>
        {:else if position.sale_revenue_token}
          <span class="text-white"
            >{formatTokenAmount(position.sale_revenue_token)}</span
          >
          <span class="text-gray-500 ml-1">
            {#if position.sale_token_used}
              {@const saleTokenInfo = getTokenInfo(position.sale_token_used)}
              {saleTokenInfo.symbol}
            {:else}
              {data.mainCurrency}
            {/if}
          </span>
        {:else}
          <span class="text-gray-500">-</span>
        {/if}
      </div>
      <div
        class="text-right text-xs {isOpen
          ? 'text-gray-500'
          : getPnLColor(position.net_profit_token)}"
      >
        {isOpen
          ? 'TBD'
          : position.net_profit_token
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
                {@const tokenInfo = getTokenInfo(token)}
                <div class="text-xs flex justify-between items-center">
                  <div class="flex items-center gap-2 min-w-0">
                    <Avatar.Root class="h-5 w-5 flex-shrink-0">
                      <Avatar.Image
                        src={tokenInfo.icon}
                        alt={tokenInfo.symbol}
                      />
                      <Avatar.Fallback class="text-[8px]"
                        >{tokenInfo.symbol.slice(0, 3)}</Avatar.Fallback
                      >
                    </Avatar.Root>
                    <span class="text-gray-400 truncate" title={token}>
                      {tokenInfo.symbol}
                    </span>
                  </div>
                  <span class="text-green-400 ml-2 flex-shrink-0">
                    +{formatTokenAmount(amount)}
                  </span>
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
                {@const tokenInfo = getTokenInfo(token)}
                <div class="text-xs flex justify-between items-center">
                  <div class="flex items-center gap-2 min-w-0">
                    <Avatar.Root class="h-5 w-5 flex-shrink-0">
                      <Avatar.Image
                        src={tokenInfo.icon}
                        alt={tokenInfo.symbol}
                      />
                      <Avatar.Fallback class="text-[8px]"
                        >{tokenInfo.symbol.slice(0, 3)}</Avatar.Fallback
                      >
                    </Avatar.Root>
                    <span class="text-gray-400 truncate" title={token}>
                      {tokenInfo.symbol}
                    </span>
                  </div>
                  <span class="text-red-400 ml-2 flex-shrink-0">
                    -{formatTokenAmount(amount)}
                  </span>
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
