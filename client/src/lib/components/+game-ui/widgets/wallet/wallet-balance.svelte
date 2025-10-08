<script lang="ts">
  import accountData from '$lib/account.svelte';
  import RotatingCoin from '$lib/components/loading-screen/rotating-coin.svelte';
  import TokenAvatar from '$lib/components/ui/token-avatar/token-avatar.svelte';
  import { walletStore } from '$lib/stores/wallet.svelte';
  import data from '$profileData';
  import {
    ChartColumn,
    RefreshCw,
    ArrowUpDown,
    Settings,
    Minus,
  } from 'lucide-svelte';
  import type { Snippet } from 'svelte';
  import { onMount, onDestroy } from 'svelte';
  import TokenValueDisplay from './token-value-display.svelte';
  import { settingsStore } from '$lib/stores/settings.store.svelte';
  import BaseTokenSelector from './base-token-selector.svelte';
  import { ScrollArea } from '$lib/components/ui/scroll-area';
  import { loadingStore } from '$lib/stores/loading.store.svelte';

  let {
    setCustomControls,
  }: { setCustomControls: (controls: Snippet<[]> | null) => void } = $props();
  const baseToken = $derived.by(() => {
    const selectedAddress = settingsStore.selectedBaseTokenAddress;
    const targetAddress = selectedAddress || data.mainCurrencyAddress;
    return data.availableTokens.find(
      (token) => token.address === targetAddress,
    );
  });

  const address = $derived(accountData.address);

  let loadingBalance = $state(false);
  let errorMessage = $state<string | null>(null);
  let showBaseTokenSelector = $state(false);
  let initialBalanceLoadCompleted = $state(false);
  let isMinimized = $state(false);
  let walletHeight = $state(320); // Default height in pixels (equivalent to h-80)
  let isResizing = $state(false);
  let resizeStartY = $state(0);
  let resizeStartHeight = $state(0);

  onMount(() => {
    // Set up custom controls for the parent draggable component
    setCustomControls(moreControls);
  });

  // Watch for wallet loading completion and trigger balance refresh
  $effect(() => {
    const walletPhaseComplete =
      loadingStore.phases.wallet.loaded >= loadingStore.phases.wallet.total;
    const hasAddress = !!address;

    if (
      walletPhaseComplete &&
      hasAddress &&
      !initialBalanceLoadCompleted &&
      !loadingBalance
    ) {
      console.log('Wallet loading completed, refreshing balances...');
      handleInitialBalanceLoad();
    }
  });

  const handleInitialBalanceLoad = async () => {
    if (!address) return;

    loadingBalance = true;
    try {
      await walletStore.update(address);
      initialBalanceLoadCompleted = true;
    } finally {
      loadingBalance = false;
    }
  };

  onDestroy(() => {
    // Clean up resize event listeners if component is destroyed during resize
    if (isResizing) {
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', handleResizeEnd);
    }
  });

  const handleRefreshBalances = async () => {
    if (!address) return;

    loadingBalance = true;
    try {
      await walletStore.update(address);
    } finally {
      loadingBalance = false;
    }
  };

  const handleToggleDisplayMode = () => {
    settingsStore.toggleWalletDisplayMode();
  };

  const handleMinimize = () => {
    isMinimized = !isMinimized;
  };

  const handleResizeStart = (e: MouseEvent) => {
    isResizing = true;
    resizeStartY = e.clientY;
    resizeStartHeight = walletHeight;
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', handleResizeEnd);
    e.preventDefault();
  };

  const handleResize = (e: MouseEvent) => {
    if (!isResizing) return;
    const deltaY = e.clientY - resizeStartY;
    const newHeight = Math.max(100, Math.min(800, resizeStartHeight + deltaY)); // Min 100px, Max 800px
    walletHeight = newHeight;
  };

  const handleResizeEnd = () => {
    isResizing = false;
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', handleResizeEnd);
  };

  const totalBalance = $derived(walletStore.totalBalance);

  // Sort tokens with base token first, then by equivalent base token balance value
  const sortedTokenBalances = $derived.by(() => {
    const tokens = walletStore.tokenBalances;
    if (!baseToken) return tokens;

    // Separate base token from others
    const baseTokenEntry = tokens.find(
      ([token]) => token.address === baseToken.address,
    );
    const otherTokens = tokens.filter(
      ([token]) => token.address !== baseToken.address,
    );

    // Sort other tokens by their equivalent base token balance (descending)
    const sortedOthers = otherTokens.sort(([tokenA], [tokenB]) => {
      // Use cached conversion values instead of converting on each comparison
      const equivalentA = walletStore.getCachedBaseTokenEquivalent(
        tokenA.address,
      );
      const equivalentB = walletStore.getCachedBaseTokenEquivalent(
        tokenB.address,
      );

      // Handle cases where conversion fails (no price data)
      if (!equivalentA && !equivalentB) {
        // Fallback to raw balance comparison
        const balanceA = walletStore.getBalance(tokenA.address);
        const balanceB = walletStore.getBalance(tokenB.address);
        if (!balanceA || !balanceB) return 0;
        return balanceB.rawValue().comparedTo(balanceA.rawValue()) as number;
      }
      if (!equivalentA) return 1; // A goes after B
      if (!equivalentB) return -1; // A goes before B

      // Compare equivalent base token values (descending order)
      return equivalentB
        .rawValue()
        .comparedTo(equivalentA.rawValue()) as number;
    });

    // Return base token first, then sorted others
    return baseTokenEntry ? [baseTokenEntry, ...sortedOthers] : sortedOthers;
  });
</script>

<div class="flex items-center border-t border-gray-700 mt-2 gap-2 p-2">
  {#if totalBalance && baseToken}
    <span class="font-ponzi-number">Balance</span>

    <div class="flex flex-1 items-center gap-2 justify-end select-text"></div>
    <button
      class="font-ponzi-number hover:bg-gray-100/10 px-1 rounded flex items-center gap-1"
      onclick={() => (showBaseTokenSelector = !showBaseTokenSelector)}
      title="Click to change base token"
    >
      <div class="font-ponzi-number">
        {totalBalance.toString()}
      </div>
      <TokenAvatar token={baseToken} class="h-6 w-6" />
      <Settings size={12} class="opacity-50" />
    </button>
  {/if}
</div>

{#if showBaseTokenSelector && !isMinimized}
  <div class="border-t border-gray-700 p-2">
    <BaseTokenSelector
      currentBaseToken={baseToken}
      onSelect={(tokenAddress: string | null) => {
        settingsStore.setSelectedBaseTokenAddress(tokenAddress);
        showBaseTokenSelector = false;
      }}
      onCancel={() => (showBaseTokenSelector = false)}
    />
  </div>
{/if}

{#if !isMinimized}
  {#if errorMessage}
    <div
      class="text-red-500 bg-red-50 border border-red-200 rounded p-2 mb-2 text-center"
    >
      {errorMessage}
    </div>
  {/if}
  <div class="flex flex-col gap-2 mb-4 relative">
    <ScrollArea>
      <div style="height: {walletHeight}px;">
        {#each sortedTokenBalances as [token, balance]}
          <div
            class="flex justify-between items-center relative gap-2 px-4 select-text"
          >
            <TokenAvatar {token} class="h-6 w-6" />
            <TokenValueDisplay amount={balance.toBigint()} {token} />
          </div>
        {/each}
      </div>
    </ScrollArea>

    <!-- Resize handle -->
    <div
      role="slider"
      tabindex="0"
      aria-valuenow={walletHeight}
      aria-valuemin={100}
      aria-valuemax={800}
      class="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize bg-transparent hover:bg-gray-600/20 transition-colors flex items-center justify-center group"
      onmousedown={handleResizeStart}
      title="Drag to resize wallet height"
      aria-label="Resize wallet height"
    >
      <div
        class="w-8 h-0.5 bg-gray-500 group-hover:bg-gray-400 transition-colors"
      ></div>
    </div>
  </div>
{/if}

{#snippet moreControls()}
  <button
    class="window-control"
    onclick={handleToggleDisplayMode}
    aria-label="Toggle wallet display mode ({settingsStore.walletDisplayMode ===
    'base'
      ? 'Show token amounts'
      : 'Show base token values'})"
    title={settingsStore.walletDisplayMode === 'base'
      ? 'Show token amounts'
      : 'Show base token values'}
  >
    <ArrowUpDown size={16} />
  </button>
  <a
    href="/dashboard"
    target="_blank"
    class="window-control w-6 h-6 flex items-center justify-center"
    aria-label="View dashboard"
  >
    <ChartColumn size={16} />
  </a>
  {#if loadingBalance}
    <div class="w-6 h-6 flex items-center justify-center">
      <RotatingCoin />
    </div>
  {:else}
    <button
      class="window-control"
      onclick={handleRefreshBalances}
      aria-label="Refresh wallet balances"
    >
      <RefreshCw size={16} />
    </button>
  {/if}
  <button class="window-control" onclick={handleMinimize}>
    <Minus size={16} />
  </button>
{/snippet}
