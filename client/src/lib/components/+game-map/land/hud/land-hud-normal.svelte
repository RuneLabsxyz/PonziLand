<script lang="ts">
  import type { LandWithActions } from '$lib/api/land';
  import * as Avatar from '$lib/components/ui/avatar/index.js';
  import type { LandYieldInfo, Token } from '$lib/interfaces';
  import { toHexWithPadding } from '$lib/utils';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import data from '$profileData';

  let {
    yieldInfo,
    burnRate,
    land,
  }: {
    yieldInfo: LandYieldInfo | undefined;
    burnRate: CurrencyAmount;
    land: LandWithActions;
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
        )!;
        let formattedAmount = CurrencyAmount.fromUnscaled(amount, tokenData);
        return {
          amount: formattedAmount,
          token: tokenData,
        };
      });
    }
  });
</script>

<div class="flex flex-col items-stretch relative w-full leading-none">
  <div class="flex justify-between items-center text-ponzi-number">
    <span>Token</span>
    <span>{land?.token?.symbol}</span>
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
                src={_yield.token.images.icon}
                alt={_yield.token.symbol}
              />
            </Avatar.Root>
          </span>
          <span>
            {_yield.amount.toString()}
            <span class="text-white">{_yield.token.symbol}</span>
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
