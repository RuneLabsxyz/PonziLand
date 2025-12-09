<script lang="ts">
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { getTokenInfo } from '$lib/utils';
  import {
    walletStore,
    getBaseToken,
    originalBaseToken,
  } from '$lib/stores/wallet.svelte';
  import data from '$profileData';
  import TokenAvatar from '$lib/components/ui/token-avatar/token-avatar.svelte';

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

{#if displayData}
  <div class="flex flex-col items-end leading-none tracking-wider">
    {#if displayData.baseEquivalent && !displayData.baseEquivalent.isZero()}
      <div
        class="flex gap-1 tracking-widest font-ponzi-number text-xs items-center"
      >
        <span class="flex opacity-80">
          <span>$</span>
          {displayData.baseEquivalent.rawValue().toNumber().toFixed(2)}
        </span>
        <span><TokenAvatar token={displayData.token} /></span>
      </div>
    {/if}
    <div class="flex items-center gap-1 leading-none">
      <span class="text-gray-400">{displayData.amount.toString()}</span>
      <span class="text-gray-500">{displayData.token.symbol}</span>
    </div>
  </div>
{:else}
  <span class="text-gray-500">-</span>
{/if}
