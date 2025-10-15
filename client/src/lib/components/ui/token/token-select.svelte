<script lang="ts">
  /**
   * Unified token selection component
   *
   * @param value - The selected token (can be Token object or string address)
   * @param tokens - Array of available tokens (defaults to all supported tokens)
   * @param disabled - Whether the select is disabled
   * @param placeholder - Placeholder text when no token is selected
   * @param class - Additional CSS classes for styling
   * @param tutorialEnabled - Enable tutorial mode restrictions
   * @param tutorialAllowedSymbol - Symbol allowed during tutorial mode
   * @param variant - Styling variant ('default' | 'swap')
   * @param id - HTML id attribute for accessibility (use with Label's for attribute)
   *
   * @example
   * <!-- Basic usage -->
   * <TokenSelect bind:value={selectedToken} />
   *
   * @example
   * <!-- With label for accessibility -->
   * <Label for="my-token">Choose Token</Label>
   * <TokenSelect bind:value={selectedToken} id="my-token" />
   *
   * @example
   * <!-- Swap variant with tutorial restrictions -->
   * <TokenSelect bind:value={selectedToken} variant="swap" tutorialEnabled={true} />
   *
   * @example
   * <!-- Custom token list from store -->
   * <TokenSelect bind:value={selectedToken} tokens={tokenStore.balances.map(tb => tb.token)} />
   */
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
  } from '$lib/components/ui/select';
  import TokenAvatar from '$lib/components/ui/token-avatar/token-avatar.svelte';
  import type { Token } from '$lib/interfaces';
  import { cn } from '$lib/utils';
  import data from '$profileData';
  import type { Selected } from 'bits-ui';
  import { tutorialState } from '$lib/components/tutorial/stores.svelte';
  import { Input } from '$lib/components/ui/input';
  import { walletStore, getBaseToken } from '$lib/stores/wallet.svelte';

  let {
    value = $bindable<Token | string | undefined>(),
    tokens = data.availableTokens,
    disabled = false,
    placeholder = 'Select Token',
    class: className,
    tutorialEnabled = false,
    tutorialAllowedSymbol = 'eSTRK',
    variant = 'default',
    id,
  } = $props<{
    value?: Token | string | undefined;
    tokens?: Token[];
    disabled?: boolean;
    placeholder?: string;
    class?: string;
    tutorialEnabled?: boolean;
    tutorialAllowedSymbol?: string;
    variant?: 'default' | 'swap';
    id?: string;
  }>();

  let selectedToken: Token | undefined = $derived.by(() => {
    if (typeof value === 'string') {
      return tokens.find((token: Token) => token.address === value);
    }
    return value;
  });

  function selectToken(address: Selected<string> | undefined) {
    if (address && address.value) {
      const foundToken = tokens.find(
        (token: Token) => token.address === address.value,
      );
      if (foundToken) {
        value = foundToken;
      }
    }
  }

  // Check if tutorial restrictions should apply
  let isTutorialActive = $derived(
    tutorialEnabled && tutorialState?.tutorialEnabled,
  );

  let avatarClasses = $derived(
    variant === 'swap' ? 'h-6 w-6 border-2 border-black' : 'h-4 w-4',
  );

  // Search functionality with balance-based sorting
  let searchQuery = $state('');
  let searchInputRef = $state<HTMLInputElement | undefined>();
  let isOpen = $state(false);
  let filteredTokens = $derived.by(() => {
    let tokensToSort = tokens;

    // Apply search filter if query exists
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      tokensToSort = tokens.filter(
        (token: Token) =>
          token.symbol.toLowerCase().includes(query) ||
          token.name?.toLowerCase().includes(query) ||
          token.address.toLowerCase().includes(query),
      );
    }

    // Sort by USD equivalent balance (descending)
    return [...tokensToSort].sort((tokenA, tokenB) => {
      const balanceA = getTokenBalance(tokenA);
      const balanceB = getTokenBalance(tokenB);

      if (!balanceA && !balanceB) return 0;
      if (!balanceA) return 1; // A goes after B (no balance goes to end)
      if (!balanceB) return -1; // A goes before B

      const usdA = getUSDEquivalent(tokenA);
      const usdB = getUSDEquivalent(tokenB);

      if (!usdA && !usdB) {
        // Fallback to raw balance comparison
        return balanceB.rawValue().comparedTo(balanceA.rawValue()) as number;
      }
      if (!usdA) return 1;
      if (!usdB) return -1;

      // Compare USD equivalent values (descending order)
      return usdB.rawValue().comparedTo(usdA.rawValue()) as number;
    });
  });

  // Get base token for USD calculations
  const baseToken = $derived(getBaseToken());

  // Helper function to get token balance
  function getTokenBalance(token: Token) {
    return walletStore.getBalance(token.address);
  }

  // Helper function to get USD equivalent
  function getUSDEquivalent(token: Token) {
    const balance = getTokenBalance(token);
    if (!balance || !baseToken) return null;
    return walletStore.convertTokenAmount(balance, token, baseToken);
  }

  // Focus the search input when the select content opens
  function focusSearchInput() {
    setTimeout(() => {
      searchInputRef?.focus();
    }, 0);
  }

  // Handle open state changes
  function handleOpenChange(open: boolean) {
    isOpen = open;
    if (open) {
      focusSearchInput();
    } else {
      // Clear search when closing
      searchQuery = '';
    }
  }

  // Handle Enter key to select first filtered token
  function handleSearchKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && filteredTokens.length > 0) {
      event.preventDefault();
      const firstToken = filteredTokens[0];
      if (
        firstToken &&
        (!isTutorialActive || firstToken.symbol === tutorialAllowedSymbol)
      ) {
        value = firstToken;
        // Clear search after selection
        searchQuery = '';
        // Close the dropdown
        isOpen = false;
      }
    }
  }
</script>

<Select
  onSelectedChange={selectToken}
  onOpenChange={handleOpenChange}
  open={isOpen}
  {disabled}
>
  <SelectTrigger {id} {variant}>
    {#if selectedToken}
      <div class="flex gap-2 items-center">
        <TokenAvatar token={selectedToken} class={avatarClasses} />
        {selectedToken.symbol}
      </div>
    {:else}
      {placeholder}
    {/if}
  </SelectTrigger>
  <SelectContent {variant} sameWidth={false}>
    <div class="w-full p-2 border-b border-white/10">
      <Input
        bind:inputElement={searchInputRef}
        type="text"
        placeholder="Search tokens..."
        bind:value={searchQuery}
        class="w-full text-sm h-8"
        onkeydown={handleSearchKeydown}
      />
    </div>
    <div class="max-h-48 overflow-y-auto">
      {#each filteredTokens as token}
        {@const balance = getTokenBalance(token)}
        {@const usdEquivalent = getUSDEquivalent(token)}
        <SelectItem
          value={token.address}
          disabled={disabled ||
            (isTutorialActive && token.symbol !== tutorialAllowedSymbol)}
          {variant}
        >
          <div class={cn('flex justify-between items-center w-full')}>
            <div class="flex gap-2 items-center">
              <TokenAvatar {token} class={avatarClasses} />
              <div class="flex flex-col">
                <span>{token.symbol}</span>
                {#if token.name && token.name !== token.symbol}
                  <span class="text-xs text-gray-400">{token.name}</span>
                {/if}
              </div>
            </div>
            {#if balance}
              <div class="flex flex-col items-end text-right font-ds text-lg">
                <span class="leading-none">{balance.toString()}</span>
                {#if usdEquivalent && baseToken}
                  <span class="leading-none text-gray-400">
                    $ {usdEquivalent.toString()}
                  </span>
                {/if}
              </div>
            {/if}
          </div>
        </SelectItem>
      {/each}
      {#if filteredTokens.length === 0 && searchQuery.trim()}
        <div class="p-3 text-center text-gray-400 text-sm">
          No tokens found matching "{searchQuery}"
        </div>
      {/if}
    </div>
  </SelectContent>
</Select>
