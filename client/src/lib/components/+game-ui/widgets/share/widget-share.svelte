<script lang="ts">
  import { X, Copy, Download } from 'lucide-svelte';
  import PnlImage from '../command-center/PnlImage.svelte';
  import type { HistoricalPosition } from '../command-center/historical-positions.service';
  import { getTokenInfo, getFullTokenInfo, getTokenMetadata, locationToCoordinates } from '$lib/utils';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import {
    getBaseToken,
    originalBaseToken,
    walletStore,
  } from '$lib/stores/wallet.svelte';
  import type { Token } from '$lib/interfaces';

  interface Props {
    position?: HistoricalPosition;
    onClose?: () => void;
    customPnlData?: {
      pnl?: number;
      boughtAt?: number;
      boughtAtTicker?: string;
      soldAt?: number;
      tokenInflow?: number;
      tokenOutflow?: number;
      tokenTickers?: string[];
      tokenInflowAmounts?: number[];
      taxes?: number;
      landTicker?: string;
    };
  }

  let { position, onClose, customPnlData }: Props = $props();

  // Calculate PnL data from position or use custom data
  const pnlImageProps = $derived.by(() => {
    if (customPnlData) {
      return customPnlData;
    }

    if (!position) {
      return {
        pnl: 75.24,
        boughtAt: 10.25,
        boughtAtTicker: 'STRK',
        soldAt: 15.87,
        tokenInflow: 156.34,
        tokenOutflow: -89.12,
        tokenTickers: ['STRK', 'ETH', 'BTC'],
        tokenInflowAmounts: [100.34, 56.0, 25.5],
        taxes: 0,
        landTicker: 'STRK',
      };
    }

    // Replicate the calculations from position-entry.svelte
    const isOpen = !position.close_date || position.close_reason === null;

    const buyToken: Token | undefined = position.buy_token_used
      ? getTokenInfo(position.buy_token_used)
      : originalBaseToken;

    const saleToken: Token | undefined = position.sale_token_used
      ? getTokenInfo(position.sale_token_used)
      : originalBaseToken;

    const buyAmount = CurrencyAmount.fromUnscaled(
      position.buy_cost_token,
      buyToken,
    );
    const sellAmount = CurrencyAmount.fromScaled(
      position.sale_revenue_token || '0',
      saleToken,
    );

    // Calculate total token inflow in base token equivalent
    const baseToken = getBaseToken();
    let totalInflowBaseEquivalent = CurrencyAmount.fromScaled(0, baseToken);
    const tokenTickers: string[] = [];
    const tokenInflowAmounts: number[] = [];

    // Collect all token data first
    const tokenDataList: Array<{
      address: string;
      symbol: string;
      icon?: string;
      amount: number;
    }> = [];

    for (const [tokenAddress, amount] of Object.entries(
      position.token_inflows,
    )) {
      const fullTokenInfo = getFullTokenInfo(tokenAddress);
      if (fullTokenInfo) {
        const { token: tokenInfo, metadata } = fullTokenInfo;
        const inflowAmount = CurrencyAmount.fromUnscaled(amount, tokenInfo);
        const convertedAmount = walletStore.convertTokenAmount(
          inflowAmount,
          tokenInfo,
          baseToken,
        );
        
        tokenDataList.push({
          address: tokenAddress,
          symbol: tokenInfo.symbol,
          icon: metadata?.icon,
          amount: convertedAmount?.rawValue().toNumber() || 0,
        });

        if (convertedAmount) {
          totalInflowBaseEquivalent =
            totalInflowBaseEquivalent.add(convertedAmount);
        }
      }
    }

    // Sort tokens by amount in descending order
    tokenDataList.sort((a, b) => b.amount - a.amount);

    // Extract sorted arrays
    const tokenMetadataList = tokenDataList.map(({ address, symbol, icon }) => ({
      address,
      symbol,
      icon,
    }));

    tokenDataList.forEach(tokenData => {
      tokenTickers.push(tokenData.symbol);
      tokenInflowAmounts.push(tokenData.amount);
    });

    // Calculate total token outflow in base token equivalent
    let totalOutflowBaseEquivalent = CurrencyAmount.fromScaled(0, baseToken);
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
          totalOutflowBaseEquivalent =
            totalOutflowBaseEquivalent.add(convertedAmount);
        }
      }
    }

    // Calculate buy cost in base token equivalent
    const buyCostBaseEquivalent =
      buyToken && buyAmount
        ? walletStore.convertTokenAmount(buyAmount, buyToken, baseToken)
        : null;

    // Calculate sale revenue in base token equivalent
    const saleRevenueBaseEquivalent =
      saleToken && sellAmount && !isOpen
        ? walletStore.convertTokenAmount(sellAmount, saleToken, baseToken)
        : null;

    // Calculate net token flow (inflow - outflow)
    const netTokenFlow =
      totalInflowBaseEquivalent && totalOutflowBaseEquivalent
        ? CurrencyAmount.fromRaw(
            totalInflowBaseEquivalent
              .rawValue()
              .minus(totalOutflowBaseEquivalent.rawValue()),
            baseToken,
          )
        : null;

    // Calculate net sale profit (sale revenue - buy cost)
    const netSaleProfit =
      buyCostBaseEquivalent && saleRevenueBaseEquivalent && !isOpen
        ? CurrencyAmount.fromRaw(
            saleRevenueBaseEquivalent
              .rawValue()
              .minus(buyCostBaseEquivalent.rawValue()),
            baseToken,
          )
        : null;

    // Calculate Realized P&L (net flow + sale P&L)
    let realizedPnL = CurrencyAmount.fromScaled(0, baseToken);
    if (isOpen) {
      // For open positions, only show net flow as unrealized
      realizedPnL = netTokenFlow || realizedPnL;
    } else {
      // For closed positions, combine net flow + sale P&L
      if (netTokenFlow) {
        realizedPnL = realizedPnL.add(netTokenFlow);
      }
      if (netSaleProfit) {
        realizedPnL = realizedPnL.add(netSaleProfit);
      }
    }

    return {
      pnl: realizedPnL.rawValue().toNumber(),
      boughtAt: buyCostBaseEquivalent?.rawValue().toNumber() || 0,
      boughtAtTicker: buyToken?.symbol || 'STRK',
      soldAt: saleRevenueBaseEquivalent?.rawValue().toNumber() || 0,
      tokenInflow: totalInflowBaseEquivalent.rawValue().toNumber(),
      tokenOutflow: -totalOutflowBaseEquivalent.rawValue().toNumber(),
      tokenTickers,
      tokenInflowAmounts,
      tokenMetadataList,
      taxes: 0,
      landTicker: saleToken?.symbol || 'STRK',
      landToken: buyToken,
    };
  });

  async function shareOnX() {
    const pnl = pnlImageProps.pnl ?? 0;
    const pnlText = `${pnl > 0 ? '+' : ''}$${Math.abs(pnl).toFixed(2)}`;
    const tweetText = `Just made ${pnlText} on my PonziLand position! 🚀\n\n${window.location.origin}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;

    window.open(twitterUrl, '_blank');
  }

  async function copyToClipboard() {
    const pnl = pnlImageProps.pnl ?? 0;
    const pnlText = `${pnl > 0 ? '+' : ''}$${Math.abs(pnl).toFixed(2)}`;
    const shareText = `PonziLand Position\nNet P&L: ${pnlText}\n${window.location.origin}`;

    try {
      await navigator.clipboard.writeText(shareText);
      console.log('Position info copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }

  function downloadImage() {
    // Create a canvas to render the PnlImage component
    const canvas = document.createElement('canvas');
    canvas.width = 760;
    canvas.height = 600;

    // For now, just trigger download of a placeholder
    // In a real implementation, you'd render the PnlImage to canvas
    const link = document.createElement('a');
    link.download = `ponziland-position-${Date.now()}.png`;
    link.href = '#'; // Would be canvas.toDataURL() in real implementation
    console.log('Download functionality would be implemented here');
  }
</script>

<!-- PnL Image Preview -->
<div class="mb-8 flex justify-center">
  <div class="border border-gray-600 rounded-lg overflow-hidden">
    <PnlImage {...pnlImageProps} />
  </div>
</div>

<!-- Share Options -->
<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
  <button
    class="flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white py-4 px-6 rounded-lg transition-colors font-medium"
    onclick={shareOnX}
  >
    <X size={20} />
    Share on X (Twitter)
  </button>

  <button
    class="flex items-center justify-center gap-3 bg-gray-700 hover:bg-gray-600 text-white py-4 px-6 rounded-lg transition-colors font-medium"
    onclick={copyToClipboard}
  >
    <Copy size={20} />
    Copy to Clipboard
  </button>

  <button
    class="flex items-center justify-center gap-3 bg-gray-700 hover:bg-gray-600 text-white py-4 px-6 rounded-lg transition-colors font-medium"
    onclick={downloadImage}
  >
    <Download size={20} />
    Download Image
  </button>
</div>

<!-- Share Stats -->
<div class="mt-6 pt-6 border-t border-gray-700">
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
    <div>
      <div class="text-2xl font-bold text-white">
        ${Math.abs(pnlImageProps.pnl || 0).toFixed(2)}
      </div>
      <div class="text-sm text-gray-400">Net P&L</div>
    </div>
    <div>
      <div class="text-2xl font-bold text-white">
        ${(pnlImageProps.boughtAt || 0).toFixed(2)}
      </div>
      <div class="text-sm text-gray-400">Bought At</div>
    </div>
    <div>
      <div class="text-2xl font-bold text-white">
        ${Math.abs(pnlImageProps.tokenInflow || 0).toFixed(2)}
      </div>
      <div class="text-sm text-gray-400">Token Inflow</div>
    </div>
    <div>
      <div class="text-2xl font-bold text-white">
        {(pnlImageProps.tokenTickers || []).length}
      </div>
      <div class="text-sm text-gray-400">Tokens</div>
    </div>
  </div>
</div>

