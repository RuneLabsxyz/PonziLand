<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import TokenAvatar from '$lib/components/ui/token-avatar/token-avatar.svelte';
  import RotatingCoin from '$lib/components/loading-screen/rotating-coin.svelte';
  import { ScrollArea } from '$lib/components/ui/scroll-area';
  import { cn, getTokenMetadata } from '$lib/utils';
  import data from '$profileData';

  import { bridgeStore } from '$lib/bridge/bridge-store.svelte';
  import { phantomWalletStore } from '$lib/bridge/phantom.svelte';
  import { accountState } from '$lib/account.svelte';
  import { walletStore } from '$lib/stores/wallet.svelte';
  import { useDojo } from '$lib/contexts/dojo';
  import type { Token } from '$lib/interfaces';

  interface Props {
    chain: 'solana' | 'starknet';
    title: string;
    bridgableSymbols: string[];
    selectedToken: string | null;
    onTokenSelect: (symbol: string) => void;
  }

  let { chain, title, bridgableSymbols, selectedToken, onTokenSelect }: Props =
    $props();

  const { accountManager } = useDojo();

  // Filter to only show tokens that exist in our game's availableTokens
  // This ensures we only display game-compatible tokens with proper icons
  // Use case-insensitive matching since Hyperlane symbols may differ in casing
  const gameCompatibleSymbols = $derived(
    bridgableSymbols.filter((symbol) =>
      data.availableTokens.some(
        (t) => t.symbol.toUpperCase() === symbol.toUpperCase(),
      ),
    ),
  );

  // Debug: log what symbols we're getting
  $effect(() => {
    if (bridgableSymbols.length > 0) {
      console.log(`[Bridge] ${chain} bridgable symbols:`, bridgableSymbols);
      console.log(`[Bridge] ${chain} game-compatible:`, gameCompatibleSymbols);
    }
  });

  // Connection status based on chain
  const isConnected = $derived(
    chain === 'solana'
      ? phantomWalletStore.isConnected
      : accountState.isConnected,
  );

  const walletAddress = $derived(
    chain === 'solana'
      ? phantomWalletStore.walletAddress
      : (accountState.address ?? ''),
  );

  // Token balances state
  let balances = $state<Map<string, string>>(new Map());
  let loadingBalances = $state(false);

  // For Starknet, get balances from walletStore
  // For Solana, fetch via Hyperlane
  $effect(() => {
    if (isConnected && walletAddress && gameCompatibleSymbols.length > 0) {
      fetchBalances();
    }
  });

  async function fetchBalances() {
    loadingBalances = true;
    const newBalances = new Map<string, string>();

    try {
      if (chain === 'starknet') {
        // Use existing wallet store for Starknet balances
        for (const symbol of gameCompatibleSymbols) {
          const token = data.availableTokens.find((t) => t.symbol === symbol);
          if (token) {
            const balance = walletStore.getBalance(token.address);
            if (balance) {
              newBalances.set(symbol, balance.toString());
            } else {
              newBalances.set(symbol, '0');
            }
          }
        }
      } else {
        // Fetch Solana balances via Hyperlane
        for (const symbol of gameCompatibleSymbols) {
          try {
            const tokenBalance = await bridgeStore.getBalance(
              'solanamainnet',
              symbol,
              walletAddress,
            );
            if (tokenBalance) {
              newBalances.set(symbol, tokenBalance.formatted);
            } else {
              newBalances.set(symbol, '0');
            }
          } catch (err) {
            console.error(`Error fetching ${symbol} balance:`, err);
            newBalances.set(symbol, '0');
          }
        }
      }
    } finally {
      balances = newBalances;
      loadingBalances = false;
    }
  }

  async function handleConnect() {
    if (chain === 'solana') {
      await phantomWalletStore.connect({ forcePrompt: true });
    } else {
      await accountManager?.promptForLogin();
    }
  }

  // Get token from game data by symbol (works for both chains since bridgable tokens share symbols)
  // Use case-insensitive matching
  function getToken(symbol: string): Token | undefined {
    return data.availableTokens.find(
      (t) => t.symbol.toUpperCase() === symbol.toUpperCase(),
    );
  }

  function getTokenIcon(symbol: string): string | undefined {
    const token = getToken(symbol);
    if (token) {
      const metadata = getTokenMetadata(token.skin);
      return metadata?.icon;
    }
    return undefined;
  }
</script>

<div class="flex flex-col">
  <!-- Header - matches wallet-balance.svelte style -->
  <div class="flex items-center border-t border-gray-700 mt-2 gap-2 p-2">
    <span class="font-ponzi-number">{title}</span>
    {#if isConnected && walletAddress}
      <div class="flex flex-1 items-center gap-2 justify-end">
        <span class="text-xs text-gray-500 font-mono">
          {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
        </span>
      </div>
    {/if}
  </div>

  <!-- Content - matches wallet-balance.svelte token list style -->
  {#if !isConnected}
    <div class="flex flex-col items-center justify-center gap-3 py-4">
      <div class="text-sm text-gray-400">Connect Phantom wallet</div>
      <Button size="sm" onclick={handleConnect}>Connect Phantom</Button>
    </div>
  {:else if loadingBalances}
    <div class="flex items-center justify-center py-8">
      <RotatingCoin />
    </div>
  {:else if gameCompatibleSymbols.length === 0}
    <div class="flex items-center justify-center py-8 text-gray-500 text-sm">
      No bridgable tokens
    </div>
  {:else}
    <div class="flex flex-col gap-2 mb-4 relative -m-1">
      <ScrollArea class="p-1">
        <div class="pr-2" style="height: 320px;">
          {#each gameCompatibleSymbols as symbol}
            {@const balance = balances.get(symbol) ?? '0'}
            {@const isSelected = selectedToken === symbol}
            {@const tokenIcon = getTokenIcon(symbol)}
            {@const token = getToken(symbol)}
            <button
              type="button"
              class={cn(
                'flex items-center gap-3 px-2 py-1 select-text rounded w-full text-left',
                isSelected
                  ? 'bg-cyan-500/20 ring-1 ring-cyan-500/50'
                  : 'hover:bg-gray-100/5',
                parseFloat(balance) === 0 ? 'opacity-50' : '',
              )}
              onclick={() => onTokenSelect(symbol)}
            >
              {#if token}
                <TokenAvatar {token} class="h-8 w-8 flex-shrink-0" />
              {:else if tokenIcon}
                <img
                  src={tokenIcon}
                  alt={symbol}
                  class="h-8 w-8 rounded-full flex-shrink-0"
                />
              {:else}
                <div
                  class="h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center text-xs flex-shrink-0"
                >
                  {symbol.slice(0, 2)}
                </div>
              {/if}
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-white">{symbol}</div>
                <div class="text-xs font-mono text-gray-400">
                  {balance}
                </div>
              </div>
              {#if isSelected}
                <div class="text-cyan-400 text-xs">→</div>
              {/if}
            </button>
          {/each}
        </div>
      </ScrollArea>
    </div>
  {/if}
</div>
