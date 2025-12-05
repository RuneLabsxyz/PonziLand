<script lang="ts">
  import * as Avatar from '$lib/components/ui/avatar/index.js';
  import type { Token } from '$lib/interfaces';
  import {
    getBaseToken,
    originalBaseToken,
    walletStore,
  } from '$lib/stores/wallet.svelte';
  import {
    getFullTokenInfo,
    getTokenInfo,
    getTokenMetadata,
    locationToCoordinates,
  } from '$lib/utils';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import data from '$profileData';
  import { ChevronDown, ChevronUp, Share2 } from 'lucide-svelte';
  import { formatTimestamp } from '../history/utils';
  import type { HistoricalPosition } from './historical-positions.service';
  import { widgetsStore } from '$lib/stores/widgets.store';

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

  // Function to open share widget with position data
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

  function sharePosition(event: MouseEvent | KeyboardEvent) {
    event.stopPropagation();
    openShareWidget(position);
  }

  const coordinates = $derived(locationToCoordinates(position.land_location));
  const isAuctionBuy = $derived(position.buy_token_used === null);

  let buyToken: Token | undefined = $derived.by(() => {
    if (position.buy_token_used) {
      return getTokenInfo(position.buy_token_used);
    } else {
      return originalBaseToken;
    }
  });

  let saleToken: Token | undefined = $derived.by(() => {
    if (position.sale_token_used) {
      return getTokenInfo(position.sale_token_used);
    } else {
      return originalBaseToken;
    }
  });

  let buyAmount = $derived(
    CurrencyAmount.fromUnscaled(position.buy_cost_token, buyToken),
  );

  let sellAmount = $derived(
    CurrencyAmount.fromScaled(position.sale_revenue_token || '0', saleToken),
  );

  // Calculate total token inflow in base token equivalent
  let totalInflowBaseEquivalent = $derived.by(() => {
    const baseToken = getBaseToken();
    let total = CurrencyAmount.fromScaled(0, baseToken);

    for (const [tokenAddress, amount] of Object.entries(
      position.token_inflows,
    )) {
      const tokenInfo = getTokenInfo(tokenAddress);
      if (tokenInfo) {
        const inflowAmount = CurrencyAmount.fromUnscaled(amount, tokenInfo);
        const convertedAmount = walletStore.convertTokenAmount(
          inflowAmount,
          tokenInfo,
          baseToken,
        );
        if (convertedAmount) {
          total = total.add(convertedAmount);
        }
      }
    }

    return total;
  });

  // Calculate total token outflow in base token equivalent
  let totalOutflowBaseEquivalent = $derived.by(() => {
    const baseToken = getBaseToken();
    let total = CurrencyAmount.fromScaled(0, baseToken);

    for (const [tokenAddress, amount] of Object.entries(
      position.token_outflows,
    )) {
      const tokenInfo = getTokenInfo(tokenAddress);
      if (tokenInfo) {
        const outflowAmount = CurrencyAmount.fromUnscaled(amount, tokenInfo);
        const convertedAmount = walletStore.convertTokenAmount(
          outflowAmount,
          tokenInfo,
          baseToken,
        );
        if (convertedAmount) {
          total = total.add(convertedAmount);
        }
      }
    }

    return total;
  });

  // Calculate net token flow (inflow - outflow) in base token equivalent
  let netTokenFlow = $derived.by(() => {
    if (!totalInflowBaseEquivalent || !totalOutflowBaseEquivalent) return null;
    const baseToken = getBaseToken();
    const netValue = totalInflowBaseEquivalent
      .rawValue()
      .minus(totalOutflowBaseEquivalent.rawValue());
    return CurrencyAmount.fromRaw(netValue, baseToken);
  });

  // Calculate buy cost in base token equivalent
  let buyCostBaseEquivalent = $derived.by(() => {
    if (!buyToken || !buyAmount) return null;
    const baseToken = getBaseToken();
    return walletStore.convertTokenAmount(buyAmount, buyToken, baseToken);
  });

  // Calculate sale revenue in base token equivalent
  let saleRevenueBaseEquivalent = $derived.by(() => {
    if (!saleToken || !sellAmount || isOpen) return null;
    const baseToken = getBaseToken();
    return walletStore.convertTokenAmount(sellAmount, saleToken, baseToken);
  });

  // Calculate net sale profit (sale revenue - buy cost) in base token equivalent
  let netSaleProfit = $derived.by(() => {
    if (!buyCostBaseEquivalent || !saleRevenueBaseEquivalent || isOpen)
      return null;
    const baseToken = getBaseToken();
    const netValue = saleRevenueBaseEquivalent
      .rawValue()
      .minus(buyCostBaseEquivalent.rawValue());
    return CurrencyAmount.fromRaw(netValue, baseToken);
  });

  // Calculate Realized P&L (net flow + sale P&L) in base token equivalent
  let realizedPnL = $derived.by(() => {
    const baseToken = getBaseToken();

    if (isOpen) {
      // For open positions, only show net flow as unrealized
      return netTokenFlow;
    } else {
      // For closed positions, combine net flow + sale P&L
      if (!netTokenFlow && !netSaleProfit) return null;

      let total = CurrencyAmount.fromScaled(0, baseToken);

      if (netTokenFlow) {
        total = total.add(netTokenFlow);
      }

      if (netSaleProfit) {
        total = total.add(netSaleProfit);
      }

      return total;
    }
  });
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
    <div class="grid grid-cols-9 gap-2 items-center tracking-wide">
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
            <span class="text-red-400"> NUKED </span>
          {/if}
          {#if position.close_reason === 'bought'}
            <img src="/ui/icons/Icon_Coin3.png" alt="Closed" class="h-4 w-4" />
            <span class="text-yellow-500"> SOLD </span>
          {/if}
          <span
            class={[
              {
                'text-yellow-500': position.close_reason === 'bought',
                'text-red-400': position.close_reason === 'nuked',
                'text-gray-400':
                  position.close_reason !== 'bought' &&
                  position.close_reason !== 'nuked',
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

      <!-- Buy Cost -->
      <div class="text-right">
        <div>
          {#if position.buy_token_used}
            {@const tokenInfo = getTokenInfo(position.buy_token_used)}
            {#if tokenInfo}
              {@const tokenMeta = getTokenMetadata(tokenInfo.skin)}
              {@const buyCurrencyAmount = CurrencyAmount.fromUnscaled(
                position.buy_cost_token,
                tokenInfo,
              )}
              <span class="text-white">
                {buyCurrencyAmount.toString()}
              </span>
              <span class="text-gray-500 ml-1">
                {tokenInfo.symbol}
              </span>
            {:else}
              <span class="text-white">
                {position.buy_cost_token}
              </span>
              <span class="text-gray-500 ml-1">
                {data.mainCurrency}
              </span>
            {/if}
          {:else}
            <span class="text-white">
              {buyAmount}
            </span>
            <span class="text-gray-500 ml-1">
              {data.mainCurrency}
            </span>
          {/if}
        </div>
        {#if buyCostBaseEquivalent}
          <div class="text-xs text-gray-400">
            ${buyCostBaseEquivalent.rawValue().toNumber().toFixed(2)}
          </div>
        {/if}
      </div>

      <!-- Sale Revenue -->
      <div class="text-right">
        <div>
          {#if isOpen}
            <span class="text-gray-500">-</span>
          {:else if position.sale_revenue_token}
            <span class="text-white">
              {sellAmount}
            </span>
            <span class="text-gray-500 ml-1">
              {#if position.sale_token_used}
                {saleToken?.symbol}
              {:else}
                {data.mainCurrency}
              {/if}
            </span>
          {:else}
            <span class="text-gray-500">-</span>
          {/if}
        </div>
        {#if saleRevenueBaseEquivalent && !isOpen}
          <div class="text-xs text-gray-400">
            ${saleRevenueBaseEquivalent.rawValue().toNumber().toFixed(2)}
          </div>
        {/if}
      </div>

      <!-- Net Flow Column -->
      <div class="text-right">
        {#if netTokenFlow && !netTokenFlow.isZero()}
          <span
            class={netTokenFlow.rawValue().isPositive()
              ? 'text-green-400'
              : 'text-red-400'}
          >
            {netTokenFlow.rawValue().isPositive() ? '+' : ''}{netTokenFlow
              .rawValue()
              .toNumber()
              .toFixed(2)} $
          </span>
        {:else}
          <span class="text-gray-500">-</span>
        {/if}
      </div>

      <!-- Sale P&L Column -->
      <div class="text-right">
        {#if netSaleProfit && !isOpen}
          <span
            class={netSaleProfit.rawValue().isPositive()
              ? 'text-green-400'
              : 'text-red-400'}
          >
            {netSaleProfit.rawValue().isPositive() ? '+' : ''}{netSaleProfit
              .rawValue()
              .toNumber()
              .toFixed(2)} $
          </span>
        {:else}
          <span class="text-gray-500">{isOpen ? 'TBD' : '-'}</span>
        {/if}
      </div>

      <!-- Realized P&L Column -->
      <div class="text-right flex items-center justify-end gap-1">
        {#if realizedPnL}
          <span
            class={realizedPnL.rawValue().isPositive()
              ? 'text-green-400'
              : 'text-red-400'}
          >
            {realizedPnL.rawValue().isPositive() ? '+' : ''}{realizedPnL
              .rawValue()
              .toNumber()
              .toFixed(2)} $
          </span>
          <div
            class="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-white/10 cursor-pointer"
            onclick={sharePosition}
            onkeydown={(e) =>
              e.key === 'Enter' || e.key === ' ' ? sharePosition(e) : null}
            title="Share position"
            role="button"
            tabindex="0"
          >
            <Share2 size={12} />
          </div>
        {:else}
          <span class="text-gray-500">{isOpen ? 'TBD' : '-'}</span>
        {/if}
      </div>
    </div>
  </button>

  <!-- Expanded Details -->
  {#if expanded}
    <div class="px-4 pb-4 bg-black/20">
      <div class="grid grid-cols-2 gap-4 mt-2">
        <!-- Token Inflows -->
        <div>
          <div class="flex justify-between items-center mb-2">
            <h4 class="text-gray-400">Token Inflows</h4>
            {#if totalInflowBaseEquivalent && !totalInflowBaseEquivalent.isZero()}
              <div class="text-sm text-blue-400">
                Total: {totalInflowBaseEquivalent.toString()}
                {getBaseToken().symbol}
              </div>
            {/if}
          </div>
          {#if Object.keys(position.token_inflows).length > 0}
            {@const fullTokenInfo = getFullTokenInfo(
              Object.keys(position.token_inflows)[0],
            )}
            <div class="space-y-1">
              {#each Object.entries(position.token_inflows) as [token, amount]}
                {#if fullTokenInfo}
                  <div class=" flex justify-between items-center">
                    <div class="flex items-center gap-2 min-w-0">
                      <Avatar.Root class="h-5 w-5 flex-shrink-0">
                        <Avatar.Image
                          src={fullTokenInfo.metadata?.icon}
                          alt={fullTokenInfo.token.symbol}
                        />
                        <Avatar.Fallback class="text-[8px]"
                          >{fullTokenInfo.token.symbol.slice(
                            0,
                            3,
                          )}</Avatar.Fallback
                        >
                      </Avatar.Root>
                      <span class="text-gray-400 truncate" title={token}>
                        {fullTokenInfo.token.symbol}
                      </span>
                    </div>
                    <span class="text-green-400 ml-2 flex-shrink-0">
                      +{CurrencyAmount.fromUnscaled(
                        amount,
                        fullTokenInfo.token,
                      )}
                    </span>
                  </div>
                {/if}
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
