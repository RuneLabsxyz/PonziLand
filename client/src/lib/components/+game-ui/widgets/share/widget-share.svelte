<script lang="ts">
  import type { Token } from '$lib/interfaces';
  import {
    getBaseToken,
    originalBaseToken,
    walletStore,
  } from '$lib/stores/wallet.svelte';
  import { getFullTokenInfo, getTokenInfo } from '$lib/utils';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { formatPercentage } from '$lib/utils/format';
  import { toPng } from 'html-to-image';
  import { Copy, Download, X } from 'lucide-svelte';
  import type { HistoricalPosition } from '../positions/historical-positions.service';
  import { calculatePositionMetrics } from '../positions/position-pnl-calculator';
  import { onMount } from 'svelte';
  import { tick } from 'svelte';
  import PnlImage from './PnlImage.svelte';
  import { Button } from '$lib/components/ui/button';

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
      roi?: number;
    };
  }

  let { position, onClose, customPnlData }: Props = $props();

  // State to store the generated image data URL
  let generatedImageUrl: string | null = $state(null);
  let copyStatus: 'idle' | 'copying' | 'copied' = $state('idle');
  let pnlImageElement: HTMLElement | undefined = $state();
  let displayMode: 'pnl' | 'roi' = $state('pnl');

  // Calculate PnL data from position or use custom data
  const pnlImageProps = $derived.by(() => {
    if (customPnlData) {
      return { ...customPnlData, displayMode };
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
        roi: 734.6, // Mock ROI percentage
        displayMode,
      };
    }

    // Use the existing position calculator
    const metrics = calculatePositionMetrics(position);

    // Determine position status
    const isOpen = metrics.isOpen;
    let status: 'alive' | 'nuked' | 'bought' = 'bought';
    if (isOpen) {
      status = 'alive';
    } else if (position.close_reason === 'nuked') {
      status = 'nuked';
    } else if (position.close_reason === 'bought') {
      status = 'bought';
    }

    // Calculate total token inflow in base token equivalent
    const baseToken = getBaseToken();
    const totalInflowBaseEquivalent =
      metrics.totalInflowBaseEquivalent ||
      CurrencyAmount.fromScaled(0, baseToken);
    const totalOutflowBaseEquivalent =
      metrics.totalOutflowBaseEquivalent ||
      CurrencyAmount.fromScaled(0, baseToken);
    const realizedPnL =
      metrics.totalPnL || CurrencyAmount.fromScaled(0, baseToken);

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

    return {
      pnl: realizedPnL.rawValue().toNumber(),
      boughtAt: metrics.buyCostBaseEquivalent?.rawValue().toNumber() || 0,
      boughtAtTicker: metrics.buyToken?.symbol || 'STRK',
      soldAt: metrics.saleRevenueBaseEquivalent?.rawValue().toNumber() || 0,
      tokenInflow: totalInflowBaseEquivalent.rawValue().toNumber(),
      tokenOutflow: -totalOutflowBaseEquivalent.rawValue().toNumber(),
      tokenTickers,
      tokenInflowAmounts,
      tokenMetadataList,
      taxes: 0,
      landTicker: metrics.saleToken?.symbol || 'STRK',
      landToken: metrics.buyToken,
      status,
      roi: metrics.roi || 0,
      displayMode,
    };
  });

  // Function to generate image
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

      // Clean up previous blob URL to prevent memory leaks
      if (generatedImageUrl) {
        URL.revokeObjectURL(generatedImageUrl);
      }

      // Create a blob URL for better display compatibility
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      generatedImageUrl = URL.createObjectURL(blob);
    } catch (err) {
      console.error('Failed to generate image:', err);
    }
  };

  // Generate image when widget loads
  onMount(() => {
    // Wait a tick to ensure the element is bound
    setTimeout(generateImage, 0);
  });

  // Regenerate image when display mode changes
  $effect(() => {
    // Watch for displayMode changes
    displayMode;

    if (pnlImageElement && generatedImageUrl) {
      // Wait for the next tick to ensure the DOM is updated with new props
      tick().then(() => {
        generateImage();
      });
    }
  });

  async function shareOnX() {
    const pnl = pnlImageProps.pnl ?? 0;
    const roi = (pnlImageProps as any).roi ?? 0;
    const isGain = pnl > 0;
    const pnlText = `${isGain ? '+' : '-'}$${Math.abs(pnl).toFixed(2)}`;
    const status = (pnlImageProps as any).status || 'bought';
    const tokenTickers = pnlImageProps.tokenTickers || [];

    // Format ROI percentage
    let roiText = '';
    if (roi !== null && roi !== undefined) {
      roiText = ` (${formatPercentage(roi)})`;
    }

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

    // Get P&L text with ROI
    let pnlStatusText = '';
    if (isGain) {
      pnlStatusText = `I Made ${pnlText}${roiText}`;
    } else {
      pnlStatusText = `I Lost ${pnlText}${roiText}`;
    }

    // Add token information if available
    let tokenText = '';
    if (tokenTickers.length > 0) {
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

<!-- Display Mode Toggle -->
<div class="mb-6">
  <label class="flex items-center gap-3 text-white cursor-pointer">
    <input
      type="checkbox"
      checked={displayMode === 'roi'}
      class="w-4 h-4 rounded border-gray-300 bg-gray-700 border-gray-600 focus:ring-blue-500 focus:ring-2"
      onchange={(e) => {
        displayMode = e.currentTarget.checked ? 'roi' : 'pnl';
      }}
    />
    <span class="text-sm">Show ROI percentage instead of P&L amount</span>
  </label>
</div>

<!-- Share Options -->
<div class="flex flex-col gap-4">
  <Button onclick={shareOnX}>Share on X (Twitter)</Button>

  <Button onclick={copyToClipboard} disabled={copyStatus === 'copying'}>
    {#if copyStatus === 'copying'}
      Copying...
    {:else if copyStatus === 'copied'}
      Copied!
    {:else}
      Copy to Clipboard
    {/if}
  </Button>

  <Button onclick={downloadImage}>Download Image</Button>
</div>

<div id="renderer" class="mt-4"></div>
