<script lang="ts">
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import type { SelectedLand } from '$lib/stores/stores.svelte';
  import type { LandYieldInfo, YieldInfo } from '$lib/interfaces';
  import type { Token } from '$lib/interfaces/token';
  import data from '$lib/data.json';
  import { toHexWithPadding } from '$lib/utils';

  let {
    yieldInfo,
    burnRate,
    land,
  }: {
    yieldInfo: LandYieldInfo | undefined;
    burnRate: CurrencyAmount;
    land: SelectedLand;
  } = $props();

  interface Yield {
    amount: CurrencyAmount;
    token: Token;
  }

  let yieldData = $state<Yield[] | undefined>(undefined);

  $effect(() => {
    if (yieldInfo) {
      const yieldsByToken = new Map<bigint, bigint>();

      for (const yield_entry of yieldInfo.yield_info) {
        const currentAmount = yieldsByToken.get(yield_entry.token) || 0n;
        yieldsByToken.set(
          yield_entry.token,
          currentAmount + yield_entry.per_hour,
        );
      }

      yieldData = Array.from(yieldsByToken.entries()).map(([token, amount]) => {
        const tokenHexAddress = toHexWithPadding(token);
        const tokenData = data.availableTokens.find(
          (tokenData) => tokenData.address === tokenHexAddress,
        );
        let formattedAmount = CurrencyAmount.fromUnscaled(amount, tokenData);
        return {
          amount: formattedAmount,
          token: tokenData,
        };
      });
    }
  });
</script>

<div class="flex flex-col items-stretch px-4 relative w-[300px] pt-2">
  <div class="flex justify-between items-center text-ponzi-number">
    <span>Token</span><span>{land?.token?.symbol}</span>
  </div>
  <div class="flex justify-between items-center">
    <span>Sell price</span><span>{land?.sellPrice?.toString()}</span>
  </div>
  <div class="flex justify-between items-center">
    <span>Stake Remaining</span><span>{land?.stakeAmount}</span>
  </div>
  <div class="flex justify-between items-center">
    <span>Burning / hour</span><span>{burnRate.toString()}</span>
  </div>

  {#if yieldData}
    <div class="flex flex-col pt-4">
      <div class="text-ponzi-number">Yield per hour:</div>
      {#each yieldData as _yield}
        <div class="flex justify-between items-center">
          <span>{_yield.amount.toString()}</span>
          <span>{_yield.token.symbol}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .text-ponzi-number {
    font-family: 'PonziNumber', sans-serif;
  }

  .low-opacity {
    opacity: 0.7;
  }
</style>
