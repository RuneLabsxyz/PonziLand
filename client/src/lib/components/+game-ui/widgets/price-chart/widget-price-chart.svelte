<script lang="ts">
  import { onMount } from 'svelte';
  import type { WidgetState } from '../widgets.config';

  let { widgetState = $bindable() }: { widgetState: WidgetState } = $props();

  let iframeRef: HTMLIFrameElement;
  let selectedToken = $state('ETH');
  let selectedTimeframe = $state('1D');
  let isLoading = $state(true);

  // Common pool addresses on Starknet (these would need to be actual pool addresses)
  const tokens = [
    { symbol: 'ETH', poolAddress: '0x698f3fbabfb7ab97d2b560ba63329917c6aff2be72bc467266a2fee34543366' },
    { symbol: 'STRK', poolAddress: '0x698f3fbabfb7ab97d2b560ba63329917c6aff2be72bc467266a2fee34543366' },
    { symbol: 'USDC', poolAddress: '0x698f3fbabfb7ab97d2b560ba63329917c6aff2be72bc467266a2fee34543366' },
    { symbol: 'USDT', poolAddress: '0x698f3fbabfb7ab97d2b560ba63329917c6aff2be72bc467266a2fee34543366' },
  ];

  const timeframes = [
    { label: '5M', value: '5m' },
    { label: '15M', value: '15m' },
    { label: '1H', value: '1h' },
    { label: '4H', value: '4h' },
    { label: '1D', value: '1d' },
    { label: '1W', value: '1w' }
  ];

  // Gecko Terminal embed URL
  $effect(() => {
    if (iframeRef) {
      const token = tokens.find(t => t.symbol === selectedToken);
      const timeframe = timeframes.find(t => t.label === selectedTimeframe);
      if (token && timeframe) {
        const embedUrl = `https://www.geckoterminal.com/starknet-alpha/pools/${token.poolAddress}?embed=1&info=1&swaps=1&grayscale=0&light_chart=0&chart_type=price&resolution=${timeframe.value}`;
        
        iframeRef.src = embedUrl;
        isLoading = true;
      }
    }
  });

  function handleIframeLoad() {
    isLoading = false;
  }

  onMount(() => {
    // Initial load will be handled by the $effect
  });
</script>

<div class="flex flex-col h-full bg-gradient-to-b from-gray-900 to-black text-white">
  <!-- Header with token selector -->
  <div class="flex items-center justify-between p-3 border-b border-gray-700">
    <div class="flex items-center gap-3">
      <h3 class="text-lg font-semibold">Price Chart</h3>
      
      <!-- Token selector -->
      <select 
        bind:value={selectedToken}
        class="bg-gray-800 border border-gray-600 rounded px-3 py-1 text-sm"
      >
        {#each tokens as token}
          <option value={token.symbol}>{token.symbol}</option>
        {/each}
      </select>
    </div>

    <!-- Timeframe selector -->
    <div class="flex gap-1">
      {#each timeframes as timeframe}
        <button
          class="px-2 py-1 text-xs rounded {selectedTimeframe === timeframe.label 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}"
          onclick={() => selectedTimeframe = timeframe.label}
        >
          {timeframe.label}
        </button>
      {/each}
    </div>
  </div>

  <!-- Chart container -->
  <div class="flex-1 relative">
    {#if isLoading}
      <div class="absolute inset-0 flex items-center justify-center bg-gray-900">
        <div class="flex flex-col items-center gap-3">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p class="text-gray-400 text-sm">Loading chart...</p>
        </div>
      </div>
    {/if}

    <iframe
      bind:this={iframeRef}
      height="100%"
      width="100%"
      id="geckoterminal-embed"
      title="GeckoTerminal Embed"
      class="w-full h-full {isLoading ? 'opacity-0' : 'opacity-100'}"
      frameborder="0"
      allow="clipboard-write"
      allowfullscreen
      onload={handleIframeLoad}
    ></iframe>
  </div>

  <!-- Footer with additional info -->
  <div class="p-2 border-t border-gray-700 text-xs text-gray-400">
    <p>Powered by GeckoTerminal • Real-time prices and charts</p>
  </div>
</div>