<script lang="ts">
  import type { LandWithActions } from '$lib/api/land';
  import TokenAvatar from '$lib/components/ui/token-avatar/token-avatar.svelte';
  import { displayCurrency } from '$lib/utils/currency';
  import type { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import data from '$profileData';

  let {
    totalYieldValue,
    burnRate,
    land,
  }: {
    totalYieldValue: number;
    burnRate: CurrencyAmount;
    land: LandWithActions;
  } = $props();

  const BASE_TOKEN = data.mainCurrencyAddress;
  let baseToken = $derived(
    data.availableTokens.find((token) => token.address === BASE_TOKEN),
  );
</script>

<div class="w-full flex flex-col gap-2">
  <div class="flex w-full justify-center select-text">
    <div class="text-center pb-2 text-ponzi-number">
      <span class="opacity-50">Total Tokens Earned</span>
      <div
        class="{totalYieldValue - Number(burnRate.toString()) >= 0
          ? 'text-green-500'
          : 'text-red-500'} text-2xl flex items-center justify-center gap-2"
      >
        <span class="stroke-3d-black">
          {totalYieldValue - Number(burnRate.toString()) >= 0
            ? '+ '
            : '- '}{displayCurrency(
            Math.abs(totalYieldValue - Number(burnRate.toString())),
          )}
        </span>
        <TokenAvatar token={baseToken} class="border border-white w-6 h-6" />
      </div>
    </div>
  </div>
  <div class="flex w-full justify-between select-text">
    <div class="flex flex-col items-center text-ponzi-number">
      <div class="opacity-50 text-sm">Earning / hour :</div>
      <div class="text-green-500 flex items-center gap-2">
        <span class="text-xl stroke-3d-black">
          +&nbsp;{displayCurrency(totalYieldValue)}
        </span>
        <TokenAvatar token={baseToken} class="border border-white w-5 h-5" />
      </div>
    </div>
    <div class="flex flex-col items-center text-ponzi-number">
      <div class="opacity-50 text-sm">Burning / hour :</div>
      <div class="text-red-500 flex items-center gap-2">
        <span class="text-xl stroke-3d-black">
          -&nbsp;{displayCurrency(burnRate.rawValue())}
        </span>
        <TokenAvatar token={baseToken} class="border border-white w-5 h-5" />
      </div>
    </div>
  </div>
  <div class="flex flex-col text-xl">
    <div class="flex justify-between w-full pt-2 leading-none">
      <div class="low-opacity">Token :</div>
      <div class="text-opacity-30">
        ${land?.token?.symbol}
      </div>
    </div>
    <div class="flex justify-between w-full leading-none">
      <div class="low-opacity">Stake Amount :</div>
      <div class="text-opacity-30">
        {land?.stakeAmount}
      </div>
    </div>
    <div class="flex justify-between w-full leading-none">
      <div class="low-opacity">Sell Price :</div>
      <div class="text-opacity-30">
        {land?.sellPrice}
      </div>
    </div>
  </div>
</div>

<style>
  .text-ponzi-number {
    font-family: 'PonziNumber', sans-serif;
  }

  .low-opacity {
    opacity: 0.7;
  }
</style>
