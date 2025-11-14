<script lang="ts">
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { getTokenInfo } from '$lib/utils';
  import { walletStore, getBaseToken } from '$lib/stores/wallet.svelte';
  import type { HistoricalPosition } from '../historical-positions.service';

  interface Props {
    position: HistoricalPosition;
  }

  let { position }: Props = $props();

  // Calculate total token inflow in base token equivalent (matches position-entry logic)
  const totalInflowBaseEquivalent = $derived.by(() => {
    const baseToken = getBaseToken();
    let total = CurrencyAmount.fromScaled(0, baseToken);

    for (const [tokenAddress, amount] of Object.entries(
      position.token_inflows,
    )) {
      const tokenInfo = getTokenInfo(tokenAddress);
      if (tokenInfo) {
        const inflowAmount = CurrencyAmount.fromUnscaled(amount, tokenInfo);
        const convertedAmount = walletStore.convertTokenAmount(
          inflowAmount,
          tokenInfo,
          baseToken,
        );
        if (convertedAmount) {
          total = total.add(convertedAmount);
        }
      }
    }

    return total;
  });

  // Calculate total token outflow in base token equivalent (matches position-entry logic)
  const totalOutflowBaseEquivalent = $derived.by(() => {
    const baseToken = getBaseToken();
    let total = CurrencyAmount.fromScaled(0, baseToken);

    for (const [tokenAddress, amount] of Object.entries(
      position.token_outflows,
    )) {
      const tokenInfo = getTokenInfo(tokenAddress);
      if (tokenInfo) {
        const outflowAmount = CurrencyAmount.fromUnscaled(amount, tokenInfo);
        const convertedAmount = walletStore.convertTokenAmount(
          outflowAmount,
          tokenInfo,
          baseToken,
        );
        if (convertedAmount) {
          total = total.add(convertedAmount);
        }
      }
    }

    return total;
  });

  // Calculate net token flow (inflow - outflow) in base token equivalent
  const netTokenFlow = $derived.by(() => {
    if (!totalInflowBaseEquivalent || !totalOutflowBaseEquivalent) return null;
    const baseToken = getBaseToken();
    const netValue = totalInflowBaseEquivalent
      .rawValue()
      .minus(totalOutflowBaseEquivalent.rawValue());
    return CurrencyAmount.fromRaw(netValue, baseToken);
  });
</script>

<div class="text-right">
  {#if netTokenFlow && !netTokenFlow.isZero()}
    <span
      class={netTokenFlow.rawValue().isPositive()
        ? 'text-green-400'
        : 'text-red-400'}
    >
      {netTokenFlow.rawValue().isPositive() ? '+' : ''}{netTokenFlow
        .rawValue()
        .toNumber()
        .toFixed(2)} $
    </span>
  {:else}
    <span class="text-gray-500">-</span>
  {/if}
</div>
