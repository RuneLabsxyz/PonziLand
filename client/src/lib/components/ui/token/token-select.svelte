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

  // Styling variants
  let triggerClasses = $derived(
    variant === 'swap'
      ? cn(
          'w-full bg-[#282835] text-[#D9D9D9] rounded font-ponzi-number stroke-3d-black',
          className,
        )
      : cn('w-full', className),
  );

  let contentClasses = $derived(
    variant === 'swap' ? 'bg-[#282835] text-white' : '',
  );

  let itemTextClasses = $derived(
    variant === 'swap' ? 'font-ponzi-number text-white' : '',
  );

  let avatarClasses = $derived(
    variant === 'swap' ? 'h-6 w-6 border-2 border-black' : 'h-4 w-4',
  );
</script>

<Select onSelectedChange={selectToken} {disabled}>
  <SelectTrigger class={triggerClasses} {id}>
    {#if selectedToken}
      <div class="flex gap-2 items-center">
        <TokenAvatar token={selectedToken} class={avatarClasses} />
        {selectedToken.symbol}
      </div>
    {:else}
      {placeholder}
    {/if}
  </SelectTrigger>
  <SelectContent class={contentClasses}>
    {#each tokens as token}
      <SelectItem
        value={token.address}
        disabled={disabled ||
          (isTutorialActive && token.symbol !== tutorialAllowedSymbol)}
      >
        <div class={cn('flex gap-2 items-center', itemTextClasses)}>
          <TokenAvatar {token} class={avatarClasses} />
          {token.symbol}
        </div>
      </SelectItem>
    {/each}
  </SelectContent>
</Select>
