<script lang="ts">
  import type { LandWithActions } from '$lib/api/land';
  import * as Avatar from '$lib/components/ui/avatar/index.js';
  import TokenAvatar from '$lib/components/ui/token-avatar/token-avatar.svelte';
  import type { LandYieldInfo, Token } from '$lib/interfaces';
  import { walletStore } from '$lib/stores/wallet.svelte';
  import { settingsStore } from '$lib/stores/settings.store.svelte';
  import { displayCurrency } from '$lib/utils/currency';
  import { getTokenMetadata, toHexWithPadding } from '$lib/utils';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import data from '$profileData';

  let {
    yieldInfo,
    totalYieldValue,
    burnRate,
    land,
  }: {
    yieldInfo: LandYieldInfo | undefined;
    totalYieldValue: number;
    burnRate: CurrencyAmount;
    land: LandWithActions;
  } = $props();

  let baseToken = $derived.by(() => {
    const selectedAddress = settingsStore.selectedBaseTokenAddress;
    const targetAddress = selectedAddress || data.mainCurrencyAddress;
    return data.availableTokens.find(
      (token) => token.address === targetAddress,
    );
  });

  interface Yield {
    amount: CurrencyAmount;
    baseValue: CurrencyAmount;
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

        // Get price from wallet store and convert to base token
        const priceInfo = walletStore.getPrice(tokenHexAddress);
        let baseValue: CurrencyAmount;

        if (tokenHexAddress === data.mainCurrencyAddress) {
          baseValue = formattedAmount;
        } else if (priceInfo?.ratio) {
          const baseAmount = formattedAmount
            .rawValue()
            .dividedBy(priceInfo.ratio.rawValue() ?? 0);
          baseValue = CurrencyAmount.fromScaled(
            baseAmount.toString(),
            baseToken,
          );
        } else {
          baseValue = formattedAmount;
        }

        return {
          amount: formattedAmount,
          baseValue,
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
  <!-- Total net value -->
  <div class="flex justify-between items-center text-ponzi-number py-2">
    <span class="opacity-50">Net / hour</span>
    <div
      class="{totalYieldValue - Number(burnRate.toString()) >= 0
        ? 'text-green-500'
        : 'text-red-500'} flex items-center gap-2"
    >
      <span>
        {totalYieldValue - Number(burnRate.toString()) >= 0 ? '+ ' : '- '}
        {displayCurrency(
          Math.abs(totalYieldValue - Number(burnRate.toString())),
        )}
      </span>
      <TokenAvatar token={baseToken} class="border border-white w-4 h-4" />
    </div>
  </div>

  <div class="flex justify-between items-center text-green-400">
    <span class="low-opacity">Earning / hour</span>
    <span class="flex items-center gap-2">
      +&nbsp;{displayCurrency(totalYieldValue)}
      <TokenAvatar token={baseToken} class="border border-white w-4 h-4" />
    </span>
  </div>

  <div class="flex justify-between items-center text-red-400">
    <span class="low-opacity">Cost / hour</span>
    <span class="flex items-center gap-2">
      -&nbsp;{displayCurrency(burnRate.rawValue())}
      <TokenAvatar token={baseToken} class="border border-white w-4 h-4" />
    </span>
  </div>
  {#if yieldData}
    <div class="flex flex-col pt-4">
      <div class="text-ponzi-number">Yield per hour:</div>
      {#each yieldData as _yield}
        <div class="flex justify-between items-center text-green-400">
          <span>
            <Avatar.Root class="h-6 w-6">
              {#await getTokenMetadata(_yield.token.skin)}
                <Avatar.Fallback>{_yield.token.symbol}</Avatar.Fallback>
              {:then metadata}
                <Avatar.Image
                  src={metadata?.icon || '/tokens/default/icon.png'}
                  alt={_yield.token.symbol}
                />
                <Avatar.Fallback>{_yield.token.symbol}</Avatar.Fallback>
              {:catch}
                <Avatar.Fallback>{_yield.token.symbol}</Avatar.Fallback>
              {/await}
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
