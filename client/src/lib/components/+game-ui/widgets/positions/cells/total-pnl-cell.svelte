<script lang="ts">
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { getTokenInfo, locationToCoordinates } from '$lib/utils';
  import {
    walletStore,
    getBaseToken,
    originalBaseToken,
  } from '$lib/stores/wallet.svelte';
  import type { HistoricalPosition } from '../historical-positions.service';
  import { widgetsStore } from '$lib/stores/widgets.store';
  import { Share } from 'lucide-svelte';

  interface Props {
    position: HistoricalPosition;
    showShareButton?: boolean;
  }

  let { position, showShareButton = true }: Props = $props();

  function isPositionOpen(position: HistoricalPosition): boolean {
    return !position.close_date || position.close_date === null;
  }

  const isOpen = $derived(isPositionOpen(position));

  // Match position-entry pattern for token selection
  let buyToken = $derived.by(() => {
    if (position.buy_token_used) {
      return getTokenInfo(position.buy_token_used);
    } else {
      return originalBaseToken;
    }
  });

  let saleToken = $derived.by(() => {
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
    CurrencyAmount.fromUnscaled(position.sale_revenue_token || '0', saleToken),
  );

  // Calculate total token inflow in base token equivalent
  const totalInflowBaseEquivalent = $derived.by(() => {
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
  const totalOutflowBaseEquivalent = $derived.by(() => {
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
  const netTokenFlow = $derived.by(() => {
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

  // Calculate Realized P&L (net flow + sale P&L) in base token equivalent - matches position-entry
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

  function openShareWidget(positionData: HistoricalPosition) {
    const coordinates = locationToCoordinates(positionData.land_location);

    widgetsStore.addWidget({
      id: `share-${positionData.land_location}-${Date.now()}`,
      type: 'share',
      position: {
        x: window.innerWidth / 2 - 183,
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
</script>

<div
  class="text-right flex items-center justify-end gap-1 font-ponzi-number text-sm tracking-widest"
>
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
    {#if showShareButton}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-white/10 cursor-pointer"
        onclick={(e) => {
          e.stopPropagation();
          openShareWidget(position);
        }}
        title="Share position"
      >
        <Share class="w-4 h-4" />
      </div>
    {/if}
  {:else}
    <span class="text-gray-500">{isOpen ? 'TBD' : '-'}</span>
  {/if}
</div>
