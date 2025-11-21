<script lang="ts">
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { getTokenInfo } from '$lib/utils';
  import {
    walletStore,
    getBaseToken,
    originalBaseToken,
  } from '$lib/stores/wallet.svelte';
  import data from '$profileData';

  interface Props {
    cost: string | null;
    tokenAddress?: string | null;
  }

  let { cost, tokenAddress }: Props = $props();

  const displayData = $derived.by(() => {
    if (!cost) {
      return null;
    }

    // Follow position-entry pattern: use token if available, otherwise originalBaseToken
    let token;
    if (tokenAddress) {
      token = getTokenInfo(tokenAddress);
    } else {
      token = originalBaseToken;
    }

    if (!token) {
      return null;
    }

    const amount = CurrencyAmount.fromUnscaled(cost, token);
    const baseEquivalent = walletStore.convertTokenAmount(
      amount,
      token,
      getBaseToken(),
    );

    return {
      amount,
      token,
      baseEquivalent,
    };
  });
</script>

<div class="text-right">
  {#if displayData}
    <div class="flex flex-col items-end">
      <div class="flex items-center gap-1">
        <span class="text-white">{displayData.amount.toString()}</span>
        <span class="text-gray-500">{displayData.token.symbol}</span>
      </div>
      {#if displayData.baseEquivalent && !displayData.baseEquivalent.isZero()}
        <div class="text-xs text-gray-400">
          ${displayData.baseEquivalent.rawValue().toNumber().toFixed(2)}
        </div>
      {/if}
    </div>
  {:else}
    <span class="text-gray-500">-</span>
  {/if}
</div>
