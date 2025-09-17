<script lang="ts">
  import accountData from '$lib/account.svelte';
  import RotatingCoin from '$lib/components/loading-screen/rotating-coin.svelte';
  import TokenAvatar from '$lib/components/ui/token-avatar/token-avatar.svelte';
  import { walletStore } from '$lib/stores/wallet.svelte';
  import data from '$profileData';
  import { ChartColumn, RefreshCw, ArrowUpDown } from 'lucide-svelte';
  import type { Snippet } from 'svelte';
  import { onMount } from 'svelte';
  import TokenValueDisplay from './token-value-display.svelte';
  import { settingsStore } from '$lib/stores/settings.store.svelte';

  let {
    setCustomControls,
  }: { setCustomControls: (controls: Snippet<[]> | null) => void } = $props();
  const baseToken = data.availableTokens.find(
    (token) => token.address === data.mainCurrencyAddress,
  );

  const address = $derived(accountData.address);

  let loadingBalance = $state(false);
  let errorMessage = $state<string | null>(null);

  onMount(() => {
    // Set up custom controls for the parent draggable component
    setCustomControls(moreControls);
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

  const totalBalance = $derived(walletStore.totalBalance);

  // Sort tokens with base token first, then by equivalent base token balance value
  const sortedTokenBalances = $derived.by(() => {
    const tokens = walletStore.tokenBalances;
    if (!baseToken) return tokens;

    // Separate base token from others
    const baseTokenEntry = tokens.find(
      ([token]) => token.address === data.mainCurrencyAddress,
    );
    const otherTokens = tokens.filter(
      ([token]) => token.address !== data.mainCurrencyAddress,
    );

    // Sort other tokens by their equivalent base token balance (descending)
    const sortedOthers = otherTokens.sort(
      ([tokenA, balanceA], [tokenB, balanceB]) => {
        // Convert each token's balance to base token equivalent
        const equivalentA = walletStore.convertTokenAmount(
          balanceA,
          tokenA,
          baseToken,
        );
        const equivalentB = walletStore.convertTokenAmount(
          balanceB,
          tokenB,
          baseToken,
        );

        // Handle cases where conversion fails (no price data)
        if (!equivalentA && !equivalentB) {
          // Fallback to raw balance comparison
          return balanceB.rawValue().comparedTo(balanceA.rawValue());
        }
        if (!equivalentA) return 1; // A goes after B
        if (!equivalentB) return -1; // A goes before B

        // Compare equivalent base token values (descending order)
        const comparison = equivalentB
          .rawValue()
          .comparedTo(equivalentA.rawValue());
        return comparison;
      },
    );

    // Return base token first, then sorted others
    return baseTokenEntry ? [baseTokenEntry, ...sortedOthers] : sortedOthers;
  });
</script>

<div class="flex items-center border-t border-gray-700 mt-2 gap-2 p-2">
  {#if totalBalance && baseToken}
    <span class="font-ponzi-number">Value in</span>
    <div class="font-ponzi-number">
      {baseToken.symbol}
    </div>
    <div class="flex flex-1 items-center gap-2 justify-end select-text">
      <div class="font-ponzi-number">
        {totalBalance.toString()}
      </div>
      <TokenAvatar token={baseToken} class="h-6 w-6" />
    </div>
  {/if}
</div>

{#if errorMessage}
  <div
    class="text-red-500 bg-red-50 border border-red-200 rounded p-2 mb-2 text-center"
  >
    {errorMessage}
  </div>
{/if}
<div class="flex flex-col gap-2 mb-4">
  {#each sortedTokenBalances as [token, balance]}
    <div
      class="flex justify-between items-center relative gap-2 px-4 select-text"
    >
      <TokenAvatar {token} class="h-6 w-6" />
      <TokenValueDisplay amount={balance.toBigint()} {token} />
    </div>
  {/each}
</div>

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
{/snippet}
