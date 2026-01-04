<script lang="ts">
  import accountDataProvider, { setup } from '$lib/account.svelte';
  import { Button } from '$lib/components/ui/button';
  import { useDojo } from '$lib/contexts/dojo';
  import { ENABLE_BRIDGE, ENABLE_TOKEN_DROP } from '$lib/flags';
  import { widgetsStore } from '$lib/stores/widgets.store';
  import { usernameStore } from '$lib/stores/username.store.svelte';
  import { padAddress, shortenHex } from '$lib/utils';
  import type { Snippet } from 'svelte';
  import WalletBalance from './wallet-balance.svelte';
  import SetUsernameButton from '$lib/components/socialink/SetUsernameButton.svelte';
  import WalletPanel from '../bridge/wallet-panel.svelte';
  import TransferPanel from '../bridge/transfer-panel.svelte';
  import { bridgeStore } from '$lib/bridge/bridge-store.svelte';
  import type { TokenInfo } from '$lib/bridge/types';
  import { phantomWalletStore } from '$lib/bridge/phantom.svelte';
  import { accountState } from '$lib/account.svelte';
  import { onMount } from 'svelte';

  let {
    setCustomControls,
  }: {
    setCustomControls: (controls: Snippet<[]> | null) => void;
  } = $props();

  // Setup account management
  setup();

  let copied = $state(false);

  // Bridge mode state
  let bridgeMode = $state(false);
  let selectedToken = $state<string | null>(null);
  let transferDirection = $state<'toGame' | 'toSolana' | null>(null);
  let sourceBalance = $state('0');

  const NORMAL_STYLES =
    'width: 380px; height: auto; top: 0px; right: 0px; transform: none;';
  const BRIDGE_STYLES =
    'width: 700px; height: auto; top: 0px; right: 0px; transform: none;';

  // Get bridgable token symbols (tokens that exist on BOTH chains)
  const bridgableSymbols = $derived.by((): string[] => {
    if (!bridgeStore.config) return [];

    const solanaTokens = bridgeStore.config.tokens
      .filter((t: TokenInfo) => t.chainName.toLowerCase().includes('solana'))
      .map((t: TokenInfo) => t.symbol);

    const starknetTokens = bridgeStore.config.tokens
      .filter((t: TokenInfo) => t.chainName.toLowerCase().includes('starknet'))
      .map((t: TokenInfo) => t.symbol);

    return [
      ...new Set(
        solanaTokens.filter((s: string) => starknetTokens.includes(s)),
      ),
    ];
  });

  // Fetch source balance when token/direction changes
  $effect(() => {
    if (selectedToken && transferDirection) {
      fetchSourceBalance();
    } else {
      sourceBalance = '0';
    }
  });

  async function fetchSourceBalance() {
    if (!selectedToken || !transferDirection) return;

    const isToGame = transferDirection === 'toGame';
    const sourceChain = isToGame ? 'solanamainnet' : 'starknet';
    const sourceAddress = isToGame
      ? phantomWalletStore.walletAddress
      : accountState.address;

    if (!sourceAddress) {
      sourceBalance = '0';
      return;
    }

    try {
      const tokenBalance = await bridgeStore.getBalance(
        sourceChain,
        selectedToken,
        sourceAddress,
      );
      if (tokenBalance) {
        sourceBalance = tokenBalance.formatted;
      } else {
        sourceBalance = '0';
      }
    } catch (err) {
      console.error('Error fetching source balance:', err);
      sourceBalance = '0';
    }
  }

  function handleSolanaTokenSelect(symbol: string) {
    selectedToken = symbol;
    transferDirection = 'toGame';
  }

  function handleStarknetTokenSelect(symbol: string) {
    selectedToken = symbol;
    transferDirection = 'toSolana';
  }

  // Handle clicking a bridgable token in the wallet balance (enables bridge mode)
  function handleStarknetBridgeClick(symbol: string) {
    if (!bridgeMode) {
      // Enable bridge mode first
      bridgeMode = true;
      widgetsStore.updateWidget('wallet', { fixedStyles: BRIDGE_STYLES });
      phantomWalletStore.initialize();
    }
    // Select the token for transfer to Solana
    selectedToken = symbol;
    transferDirection = 'toSolana';
  }

  // Ensure wallet starts with normal width on mount
  onMount(() => {
    widgetsStore.updateWidget('wallet', { fixedStyles: NORMAL_STYLES });
  });

  function toggleBridgeMode() {
    bridgeMode = !bridgeMode;
    if (bridgeMode) {
      widgetsStore.updateWidget('wallet', { fixedStyles: BRIDGE_STYLES });
      phantomWalletStore.initialize();
      // Load bridge config
      bridgeStore.loadConfig().catch((err) => {
        console.error('Failed to load bridge config:', err);
      });
    } else {
      widgetsStore.updateWidget('wallet', { fixedStyles: NORMAL_STYLES });
      selectedToken = null;
      transferDirection = null;
    }
  }

  function copy() {
    try {
      navigator.clipboard.writeText(padAddress(address ?? '')!);

      copied = true;
      setTimeout(() => {
        copied = false;
      }, 1000);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  }

  function openNftLink() {
    widgetsStore.addWidget({
      id: 'nft-link',
      type: 'nft-link',
      position: { x: 100, y: 100 },
      dimensions: { width: 500, height: 500 },
      isMinimized: false,
      isOpen: true,
      data: {},
    });
  }

  function openSwapWidget() {
    widgetsStore.updateWidget('swap', { isOpen: true });
  }

  function openBridgeWidget() {
    toggleBridgeMode();
  }

  const { accountManager } = useDojo();
  let address = $derived(accountDataProvider.address);
  let username = $derived(usernameStore.promise);
  let connected = $derived(accountDataProvider.isConnected);
  let providerIcon = $derived(accountDataProvider.providerIcon);
  let providerName = $derived(accountDataProvider.providerName);

  // Debug logging for tutorial mode
  $effect(() => {
    console.log('[WalletWidget] Account state:', {
      connected,
      address,
      providerName,
      providerIcon,
      accountDataProvider: accountDataProvider,
    });
  });

  function handleProviderIconClick() {
    if (accountManager?.getProvider()) {
      const controller = accountManager.getProvider() as any;
      if (controller.openProfile) {
        controller.openProfile();
      }
    }
  }
</script>

{#if connected}
  <div class="flex justify-between items-center mt-2">
    <div class="flex gap-2 items-center">
      {#if providerIcon}
        <button
          type="button"
          class="{providerName === 'controller'
            ? 'hover:cursor-pointer hover:opacity-50'
            : ''} h-4 w-4 rounded flex items-center justify-center"
          onclick={providerName === 'controller'
            ? handleProviderIconClick
            : undefined}
        >
          <img
            src={providerIcon}
            alt="Wallet provider"
            class="h-4 w-4 rounded"
          />
        </button>
      {/if}
      <button
        type="button"
        onclick={copy}
        class="text-left relative"
        data-highlight-target="wallet-address"
      >
        <p class="font-ponzi-number">
          {shortenHex(padAddress(address ?? ''), 4)}
        </p>
        {#if copied}
          <div class="absolute right-0 translate-x-full pl-2 top-0">
            Copied!
          </div>
        {/if}
      </button>
      {#await username then info}
        {#if info?.exists}
          <span class="font-ponzi-number text-sm opacity-75">
            ({info.username})
          </span>
        {:else}
          <SetUsernameButton />
        {/if}
      {/await}
    </div>
    <button
      onclick={() => {
        accountManager?.disconnect();
      }}
      aria-label="Logout"
    >
      <img src="/ui/icons/logout.png" alt="logout" class="h-5 w-5" />
    </button>
  </div>
  {#if ENABLE_TOKEN_DROP}
    <div class="flex">
      <Button size="md" class="w-full mt-2" onclick={openNftLink}>
        Claim token drop
      </Button>
    </div>
  {/if}

  <div class="flex flex-col">
    <div class="flex gap-3">
      {#if bridgeMode && ENABLE_BRIDGE}
        <!-- Left: Solana Wallet Panel (shown when bridge mode is active) -->
        <div class="flex-1">
          {#if !bridgeStore.isReady}
            <div class="flex flex-col items-center justify-center py-8 gap-2">
              <span class="text-gray-400 text-sm">Initializing bridge...</span>
            </div>
          {:else if bridgeStore.configError}
            <div class="p-3 bg-red-800/20 rounded text-red-400 text-sm">
              Bridge error: {bridgeStore.configError}
            </div>
          {:else}
            <WalletPanel
              chain="solana"
              title="Solana Wallet"
              {bridgableSymbols}
              {selectedToken}
              onTokenSelect={handleSolanaTokenSelect}
            />
          {/if}
        </div>
      {/if}

      <!-- Right: Game Wallet (always shown) -->
      <div class={bridgeMode && ENABLE_BRIDGE ? 'flex-1' : 'w-full'}>
        <WalletBalance
          {setCustomControls}
          bridgableSymbols={ENABLE_BRIDGE ? bridgableSymbols : []}
          onBridgeTokenClick={handleStarknetBridgeClick}
          title={bridgeMode && ENABLE_BRIDGE ? 'Game Wallet' : undefined}
        />
      </div>
    </div>

    {#if bridgeMode && ENABLE_BRIDGE && bridgeStore.isReady && !bridgeStore.configError}
      <!-- Transfer Panel (only in bridge mode) -->
      <TransferPanel {selectedToken} {transferDirection} {sourceBalance} />

      <!-- Close bridge button -->
      <div class="flex gap-2 mt-2">
        <Button size="md" class="flex-1" onclick={toggleBridgeMode}>
          ← Close Bridge
        </Button>
      </div>
    {:else}
      <!-- Action buttons (normal mode or bridge not ready) -->
      <div class="flex gap-2">
        <Button size="md" class="flex-1" onclick={openSwapWidget}>SWAP</Button>
        {#if ENABLE_BRIDGE}
          <Button
            size="md"
            class="flex-1"
            onclick={openBridgeWidget}
            data-highlight-target="bridge-button"
          >
            {bridgeMode ? 'BRIDGING...' : 'BRIDGE'}
          </Button>
        {/if}
      </div>
    {/if}
  </div>
{:else}
  <Button
    class="m-2"
    onclick={async () => {
      await accountManager?.promptForLogin();
    }}
  >
    CONNECT WALLET
  </Button>
{/if}
