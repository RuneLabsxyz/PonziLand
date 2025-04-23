<script lang="ts">
  import { selectedLandMeta } from '$lib/stores/stores.svelte';
  import type { LandYieldInfo, YieldInfo } from '$lib/interfaces';
  import LandOverview from '../../land/land-overview.svelte';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { getTokenPrices } from '$lib/components/defi/ekubo/requests';
  import { toHexWithPadding } from '$lib/utils';
  import data from '$lib/data.json';
  import { GAME_SPEED } from '$lib/const';
  import type { SelectedLand } from '$lib/stores/stores.svelte';
  import { calculateBurnRate } from '$lib/utils/taxes';
  import type { LandWithActions } from '$lib/api/land.svelte';

  let {
    land,
    isOwner,
  }: {
    land: SelectedLand;
    isOwner: boolean;
  } = $props();

  let yieldInfo: LandYieldInfo | undefined = $state(undefined);
  let tokenPrices = $state<
    { symbol: string; address: string; ratio: number | null }[]
  >([]);
  let formattedYields = $state<
    { amount: string; baseValue: string | CurrencyAmount }[]
  >([]);
  let totalYieldValue: number = $state(0);

  let burnRate = $derived(
    calculateBurnRate(land as LandWithActions, getNumberOfNeighbours() || 0),
  );

  function getNumberOfNeighbours() {
    if (land == undefined) return;
    return yieldInfo?.yield_info.filter((info) => info.percent_rate).length;
  }

  $effect(() => {
    if (land == undefined) return;
    land.getYieldInfo().then((info) => {
      yieldInfo = info;

      // Fetch token prices
      getTokenPrices().then((prices) => {
        tokenPrices = prices;
        let totalValue = 0;
        // Process yield information with prices
        if (yieldInfo?.yield_info) {
          formattedYields = Object.entries(yieldInfo.yield_info).map(
            ([tokenAddress, yieldData]) => {
              // Find token data from data.json
              const tokenHexAddress = toHexWithPadding(yieldData.token);
              const tokenData = data.availableTokens.find(
                (token) => token.address === tokenHexAddress,
              );

              // Format the amount using CurrencyAmount with proper token data
              const amount = CurrencyAmount.fromUnscaled(
                yieldData.per_hour,
                tokenData,
              );

              // Find price ratio for this token
              const priceInfo = tokenPrices.find(
                (p) => p.address === tokenHexAddress,
              );

              // Calculate base token value if ratio exists
              let baseValue = null;
              if (priceInfo?.ratio !== null && priceInfo) {
                const baseAmount = amount
                  .rawValue()
                  .dividedBy(priceInfo.ratio || 0);
                baseValue = CurrencyAmount.fromScaled(
                  baseAmount.toString(),
                ).toString();
                totalValue += Number(
                  amount.rawValue().dividedBy(priceInfo.ratio || 0),
                );
              } else {
                baseValue = amount;
                totalValue += Number(amount.rawValue());
              }

              return {
                amount: amount.toString(),
                baseValue,
              };
            },
          );
        }
        totalYieldValue = totalValue;
      });
    });
  });
</script>

<div class="flex items-center justify-center gap-4 p-4 relative">
  {#if isOwner}
    <!-- Absolute-positioned crown -->
    <div class="absolute -top-8 -left-7">
      <div class="flex justify-center">
        <div class="h-10 w-10">
          <img
            src="/ui/icons/Icon_Crown.png"
            alt="owner"
            style="image-rendering: pixelated; transform: rotate(-30deg);"
          />
        </div>
      </div>
    </div>
  {/if}
  {#if $selectedLandMeta}
    <LandOverview land={$selectedLandMeta} />
  {/if}

  {#if formattedYields.length > 0}
    <div class="yield-info flex flex-col items-center">
      <div class="text-center pb-2 text-xl low-opacity text-ponzi-number">
        Total Tokens Earned
        <div
          class="{totalYieldValue - Number(burnRate.toString()) >= 0
            ? 'text-green-500'
            : 'text-red-500'} text-2xl flex items-center justify-center"
        >
          <span
            >{totalYieldValue - Number(burnRate.toString()) >= 0
              ? '+ '
              : '- '}{Math.abs(
              totalYieldValue - Number(burnRate.toString()),
            ).toFixed(2)}</span
          >
          <img src="/tokens/eSTRK/icon.png" alt="" class="ml-1 h-5 w-5" />
        </div>
      </div>

      <div class="flex w-full justify-between low-opacity">
        <div class="flex flex-col items-center text-ponzi-number">
          <div class="text-xs">Earning / day :</div>
          <div class="text-green-500 text-sm flex items-center">
            <span>+ {totalYieldValue.toFixed(2)}</span>
            <img src="/tokens/eSTRK/icon.png" alt="" class="ml-1 h-4 w-4" />
          </div>
        </div>

        <div class="flex flex-col items-center text-ponzi-number">
          <div class="text-xs">Burning / day :</div>
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
