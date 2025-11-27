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
  import { formatTimestamp, formatTimestampRelative } from '../history/utils';

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

  const coordinates = $derived(locationToCoordinates(position.land_location));
  const isAuctionBuy = $derived(position.buy_token_used === null);
</script>

<div
  class={[
    'position-entry border-b border-gray-800/50',
    {
      'bg-green-900/10': isOpen,
    },
  ]}
>
  <!-- Main Row -->
  <button
    class="w-full px-4 py-3 hover:bg-white/5 transition-colors relative"
    onclick={toggleExpanded}
  >
    {#if isOpen}
      <div class="absolute left-0 top-0 bottom-0 w-1 bg-green-400"></div>
    {/if}
    <div class="grid grid-cols-7 gap-2 items-center tracking-wide">
      <div class="flex items-center gap-2">
        <span class="text-gray-300 tracking-wide"
          >{coordinates.x}, {coordinates.y}</span
        >
        {#if expanded}
          <ChevronUp size={14} class="text-gray-500" />
        {:else}
          <ChevronDown size={14} class="text-gray-500" />
        {/if}
      </div>
      <div
        class="flex gap-1 items-center font-ponzi-number text-xs tracking-wider"
      >
        {#if isOpen}
          <img
            src="/ui/icons/IconTiny_Stats.png"
            alt="Closed"
            class="h-4 w-4"
          />
          <span class="text-green-400 font-semibold">ALIVE</span>
        {:else}
          {#if position.close_reason === 'nuked'}
            <img src="/ui/icons/Icon_Nuke.png" alt="Closed" class="h-4 w-4" />
          {/if}
          {#if position.close_reason === 'bought'}
            <img src="/ui/icons/Icon_Coin3.png" alt="Closed" class="h-4 w-4" />
          {/if}
          <span
            class={[
              {
                'text-yellow-500': position.close_reason === 'bought',
                'text-red-400': position.close_reason === 'nuked',
                'text-gray-400': position.close_reason !== 'bought' && position.close_reason !== 'nuked',
              },
            ]}
          >
            {position.close_reason.toUpperCase()}
          </span>
        {/if}
      </div>
      <div class="flex text-gray-400">
        {formatDate(position.time_bought)}
        {#if isAuctionBuy}
          <span class="text-blue-400 ml-1">(auction)</span>
        {:else}
          <span class="text-purple-400 ml-1">(player)</span>
        {/if}
      </div>

      <div class="flex text-gray-400">
        {isOpen ? '-' : formatTimestamp(new Date(position.close_date))}
      </div>
      <div class="text-right">
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
      <div class="text-right">
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
        class={[
          'text-right',
          {
            'text-gray-500': isOpen || !position.net_profit_token,
            'text-red-400': !isOpen && position.net_profit_token?.startsWith('-'),
            'text-green-400': !isOpen && position.net_profit_token && !position.net_profit_token.startsWith('-'),
          },
        ]}
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
          <h4 class=" text-gray-400 mb-2">Token Inflows</h4>
          {#if Object.keys(position.token_inflows).length > 0}
            <div class="space-y-1">
              {#each Object.entries(position.token_inflows) as [token, amount]}
                {@const tokenInfo = getTokenInfo(token)}
                <div class=" flex justify-between items-center">
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
            <div class=" text-gray-600">No inflows</div>
          {/if}
        </div>

        <!-- Token Outflows -->
        <div>
          <h4 class=" text-gray-400 mb-2">Token Outflows</h4>
          {#if Object.keys(position.token_outflows).length > 0}
            <div class="space-y-1">
              {#each Object.entries(position.token_outflows) as [token, amount]}
                {@const tokenInfo = getTokenInfo(token)}
                <div class=" flex justify-between items-center">
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
            <div class=" text-gray-600">No outflows</div>
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
