<script lang="ts">
  import TokenAvatar from '$lib/components/ui/token-avatar/token-avatar.svelte';
  import data from '$profileData';
  import type { Token } from '$lib/interfaces';

  let {
    currentBaseToken,
    onSelect,
    onCancel,
  }: {
    currentBaseToken: Token | undefined;
    onSelect: (tokenAddress: string | null) => void;
    onCancel: () => void;
  } = $props();

  const handleTokenSelect = (tokenAddress: string | null) => {
    onSelect(tokenAddress);
  };
</script>

<div class="space-y-2">
  <h3 class="text-sm font-semibold text-gray-200">Select Base Token</h3>
  <div class="grid grid-cols-1 gap-1 max-h-40 overflow-y-auto">
    <button
      class="flex items-center gap-2 p-2 rounded hover:bg-gray-100/10 text-left {currentBaseToken?.address ===
      data.mainCurrencyAddress
        ? 'bg-gray-100/20'
        : ''}"
      onclick={() => handleTokenSelect(null)}
    >
      <TokenAvatar
        token={data.availableTokens.find(
          (t) => t.address === data.mainCurrencyAddress,
        )}
        class="h-5 w-5"
      />
      <div class="flex-1">
        <div class="text-sm font-medium">
          {data.availableTokens.find(
            (t) => t.address === data.mainCurrencyAddress,
          )?.symbol} (Default)
        </div>
        <div class="text-xs text-gray-400">
          {data.availableTokens.find(
            (t) => t.address === data.mainCurrencyAddress,
          )?.name}
        </div>
      </div>
      {#if !currentBaseToken || currentBaseToken.address === data.mainCurrencyAddress}
        <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
      {/if}
    </button>

    {#each data.availableTokens.filter((token) => token.address !== data.mainCurrencyAddress) as token}
      <button
        class="flex items-center gap-2 p-2 rounded hover:bg-gray-100/10 text-left {currentBaseToken?.address ===
        token.address
          ? 'bg-gray-100/20'
          : ''}"
        onclick={() => handleTokenSelect(token.address)}
      >
        <TokenAvatar {token} class="h-5 w-5" />
        <div class="flex-1">
          <div class="text-sm font-medium">{token.symbol}</div>
          <div class="text-xs text-gray-400">{token.name}</div>
        </div>
        {#if currentBaseToken?.address === token.address}
          <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
        {/if}
      </button>
    {/each}
  </div>

  <div class="flex justify-end pt-2">
    <button
      class="text-sm px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded"
      onclick={onCancel}
    >
      Cancel
    </button>
  </div>
</div>
