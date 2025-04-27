<script lang="ts">
  import type { SelectedLand } from '$lib/stores/stores.svelte';
  import type { CurrencyAmount } from '$lib/utils/CurrencyAmount';

  let {
    totalYieldValue,
    burnRate,
    land,
  }: {
    totalYieldValue: number;
    burnRate: CurrencyAmount;
    land: SelectedLand;
  } = $props();
</script>

<div class="flex items-center justify-center gap-4 p-4 relative">
  <div class="yield-info flex flex-col items-center">
    <div class="text-center pb-2 text-xl low-opacity text-ponzi-number">
      Total Tokens Earned
      <div
        class="{(totalYieldValue / 5) - Number(burnRate.toString()) >= 0
          ? 'text-green-500'
          : 'text-red-500'} text-2xl flex items-center justify-center"
      >
        <span
          >{(totalYieldValue / 5) - Number(burnRate.toString()) >= 0
            ? '+ '
            : '- '}{Math.abs(
            (totalYieldValue / 5) - Number(burnRate.toString()),
          ).toFixed(2)}</span
        >
        <img src="/tokens/eSTRK/icon.png" alt="" class="ml-1 h-5 w-5" />
      </div>
    </div>

    <div class="flex w-full justify-between low-opacity">
      <div class="flex flex-col items-center text-ponzi-number">
        <div class="text-xs">Earning / hour :</div>
        <div class="text-green-500 text-sm flex items-center">
          <span>+ {totalYieldValue.toFixed(2)}</span>
          <img src="/tokens/eSTRK/icon.png" alt="" class="ml-1 h-4 w-4" />
        </div>
      </div>

      <div class="flex flex-col items-center text-ponzi-number">
        <div class="text-xs">Burning / hour :</div>
        <div class="text-red-500 text-sm flex items-center">
          <span>- {burnRate.toString()}</span>
          <img src="/tokens/eSTRK/icon.png" alt="" class="ml-1 h-4 w-4" />
        </div>
      </div>
    </div>
    <div class="flex text-xs justify-between w-full pt-2">
      <div class="low-opacity">Token :</div>
      <div class="text-opacity-30">
        ${land?.token?.symbol}
      </div>
    </div>
    <div class="flex text-xs justify-between w-full">
      <div class="low-opacity">Stake Amount :</div>
      <div class="text-opacity-30">
        {land?.stakeAmount}
      </div>
    </div>
    <div class="flex text-xs justify-between w-full">
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
