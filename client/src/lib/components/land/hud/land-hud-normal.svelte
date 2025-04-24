<script lang="ts">
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import type { SelectedLand } from '$lib/stores/stores.svelte';
  import type { LandYieldInfo, YieldInfo } from '$lib/interfaces';
  import type { Token } from '$lib/interfaces/token';
  import data from '$lib/data.json';
  import { toHexWithPadding } from '$lib/utils';
  import * as Avatar from '$lib/components/ui/avatar/index.js';

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
    <span class="low-opacity">Token</span><span>{land?.token?.symbol}</span>
  </div>
  <div class="flex justify-between items-center">
    <span class="low-opacity">Sell price</span><span
      >{land?.sellPrice?.toString()}</span
    >
  </div>
  <div class="flex justify-between items-center">
    <span class="low-opacity">Stake Remaining</span><span
      >{land?.stakeAmount}</span
    >
  </div>
  <div class="flex justify-between items-center text-red-400">
    <span class="low-opacity">Burning / hour</span>
    <span class="flex items-center gap-2">
      {burnRate.toString()}
    </span>
  </div>

  {#if yieldData}
    <div class="flex flex-col pt-4">
      <div class="text-ponzi-number">Yield per hour:</div>
      {#each yieldData as _yield}
        <div class="flex justify-between items-center text-green-400">
          <span>
            <Avatar.Root class="h-6 w-6">
              <Avatar.Image
                src="/tokens/{_yield.token.symbol}/icon.png"
                alt={_yield.token.symbol}
              />
            </Avatar.Root>
          </span>
          <span class="low-opacity">
            {_yield.amount.toString()}
            <span class="text-ponzi-number text-white"
              >{_yield.token.symbol}</span
            >
          </span>
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
