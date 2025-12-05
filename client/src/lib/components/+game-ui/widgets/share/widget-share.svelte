<script lang="ts">
  import type { Token } from '$lib/interfaces';
  import {
    getBaseToken,
    originalBaseToken,
    walletStore,
  } from '$lib/stores/wallet.svelte';
  import { getFullTokenInfo, getTokenInfo } from '$lib/utils';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { toPng } from 'html-to-image';
  import { Copy, Download, X } from 'lucide-svelte';
  import type { HistoricalPosition } from '../positions/historical-positions.service';
  import { onMount } from 'svelte';
  import PnlImage from './PnlImage.svelte';

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

  // State to store the generated image data URL
  let generatedImageUrl: string | null = $state(null);
  let copyStatus: 'idle' | 'copying' | 'copied' = $state('idle');
  let pnlImageElement: HTMLElement | undefined = $state();

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

    // Determine position status
    let status: 'alive' | 'nuked' | 'bought' = 'bought';
    if (isOpen) {
      status = 'alive';
    } else if (position.close_reason === 'nuked') {
      status = 'nuked';
    } else if (position.close_reason === 'bought') {
      status = 'bought';
    }

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
    const sellAmount = CurrencyAmount.fromUnscaled(
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
      dollarAmount: number;
      originalAmount: string;
      token: any;
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
          dollarAmount: convertedAmount?.rawValue().toNumber() || 0,
          originalAmount: inflowAmount.toString(), // Store the original unscaled amount
          token: tokenInfo,
        });

        if (convertedAmount) {
          totalInflowBaseEquivalent =
            totalInflowBaseEquivalent.add(convertedAmount);
        }
      }
    }

    // Sort tokens by dollar amount in descending order
    tokenDataList.sort((a, b) => b.dollarAmount - a.dollarAmount);

    // Extract sorted arrays
    const tokenMetadataList = tokenDataList.map(
      ({ address, symbol, icon, originalAmount, token }) => ({
        address,
        symbol,
        icon,
        originalAmount,
        token,
      }),
    );

    tokenDataList.forEach((tokenData) => {
      tokenTickers.push(tokenData.symbol);
      tokenInflowAmounts.push(tokenData.dollarAmount);
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
      status,
    };
  });

  // Generate image when widget loads
  onMount(() => {
    const generateImage = async () => {
      if (!pnlImageElement) {
        console.error('PnL image element not yet bound.');
        return;
      }

      try {
        pnlImageElement.style.setProperty('display', 'flex');
        const dataUrl = await toPng(pnlImageElement, {
          backgroundColor: 'transparent',
          pixelRatio: 1,
        });
        pnlImageElement.style.setProperty('display', 'none');

        // Create a blob URL for better display compatibility
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        generatedImageUrl = URL.createObjectURL(blob);
      } catch (err) {
        console.error('Failed to generate image on load:', err);
      }
    };

    // Wait a tick to ensure the element is bound
    setTimeout(generateImage, 0);
  });

  async function shareOnX() {
    const pnl = pnlImageProps.pnl ?? 0;
    const isGain = pnl > 0;
    const pnlText = `${isGain ? '+' : '-'}$${Math.abs(pnl).toFixed(2)}`;
    const status = (pnlImageProps as any).status || 'bought';
    const tokenTickers = pnlImageProps.tokenTickers || [];

    // Get status text
    let statusText = '';
    let emoji = '';

    switch (status) {
      case 'alive':
        statusText = 'My @ponzidotland land is printing';
        emoji = '🚀';
        break;
      case 'nuked':
        statusText = 'My @ponzidotland land got nuked';
        emoji = '💥';
        break;
      case 'bought':
        statusText = 'Just closed my @ponzidotland land';
        emoji = isGain ? '💰' : '📈';
        break;
      default:
        statusText = 'My @ponzidotland land';
        emoji = isGain ? '🚀' : '📈';
    }

    // Get P&L text
    let pnlStatusText = '';
    if (isGain) {
      pnlStatusText = `I Made ${pnlText}`;
    } else {
      pnlStatusText = `I Lost ${pnlText}`;
    }

    // Add token information if available
    let tokenText = '';
    if (tokenTickers.length > 0) {
      const tokenInflowAmounts = pnlImageProps.tokenInflowAmounts || [];
      const totalTokenValue = tokenInflowAmounts.reduce(
        (sum, amount) => sum + (amount || 0),
        0,
      );
      const uniqueTokens = [...new Set(tokenTickers)].slice(0, 3);

      if (uniqueTokens.length === 1) {
        tokenText = `while accumulating $${uniqueTokens[0]}`;
      } else if (uniqueTokens.length === 2) {
        tokenText = `while accumulating $${uniqueTokens[0]} and $${uniqueTokens[1]}`;
      } else {
        const lastToken = uniqueTokens.pop();
        tokenText = `while accumulating $${uniqueTokens.join(', $')}, and $${lastToken}`;
      }
    }

    const tweetText = `${statusText} ${emoji}\n${pnlStatusText} ${tokenText}! \n\nPlay at https://play.ponzi.land`;

    // Fallback to Twitter URL
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(twitterUrl, '_blank');
  }

  async function copyToClipboard() {
    if (!generatedImageUrl) {
      console.error(
        'Image not yet generated. Please wait a moment and try again.',
      );
      return;
    }

    copyStatus = 'copying';

    try {
      const response = await fetch(generatedImageUrl);
      const blob = await response.blob();

      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ]);

      copyStatus = 'copied';
      console.log('Image copied to clipboard!');
    } catch (error) {
      copyStatus = 'idle';
      console.error('Failed to copy image:', error);
    }
  }

  async function downloadImage() {
    if (!generatedImageUrl) {
      console.error(
        'Image not yet generated. Please wait a moment and try again.',
      );
      return;
    }

    try {
      // Create download link using the pre-generated image
      const link = document.createElement('a');
      link.download = `ponziland-position-${Date.now()}.png`;
      link.href = generatedImageUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to download image:', err);
    }
  }
</script>

<!-- PnL Image Preview -->
<div class="mb-8 mt-4 min-h-[280px] flex justify-center">
  {#if generatedImageUrl}
    <img src={generatedImageUrl} alt="PnL Position" />
  {/if}
  <!-- Hidden PnL component for image generation -->
  <div class="absolute top-[99999px] left-[99999px]">
    <PnlImage {...pnlImageProps} bind:elementRef={pnlImageElement} />
  </div>
</div>

<!-- Share Options -->
<div class="flex flex-col gap-4">
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
    disabled={copyStatus === 'copying'}
  >
    <Copy size={20} />
    {#if copyStatus === 'copying'}
      Copying...
    {:else if copyStatus === 'copied'}
      Copied!
    {:else}
      Copy to Clipboard
    {/if}
  </button>

  <button
    class="flex items-center justify-center gap-3 bg-gray-700 hover:bg-gray-600 text-white py-4 px-6 rounded-lg transition-colors font-medium"
    onclick={downloadImage}
  >
    <Download size={20} />
    Download Image
  </button>
</div>

<div id="renderer" class="mt-4"></div>
