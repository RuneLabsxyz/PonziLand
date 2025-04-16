<script lang="ts">
  import { selectedLandMeta } from '$lib/stores/stores.svelte';
  import type { LandYieldInfo, YieldInfo } from '$lib/interfaces';
  import LandOverview from '../../land/land-overview.svelte';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { getTokenPrices } from '$lib/components/defi/ekubo/requests';
  import { toHexWithPadding } from '$lib/utils';
  import data from '$lib/data.json';
  import { GAME_SPEED } from '$lib/const';

  let land = $derived($selectedLandMeta);

  let yieldInfo: LandYieldInfo | undefined = $state(undefined);
  let tokenPrices = $state<
    { symbol: string; address: string; ratio: number | null }[]
  >([]);
  let formattedYields = $state<
    { amount: string; baseValue: string | CurrencyAmount }[]
  >([]);
  let totalYieldValue: number = $state(0);

  let burnRate: number = $derived(calculateBurnRate()?.toNumber() || 0);

  function calculateBurnRate() {
    if (land == undefined) return;
    let landInfo = land.sellPrice
      .rawValue()
      .multipliedBy(0.02)
      .multipliedBy(GAME_SPEED);

    let burnRate = landInfo.multipliedBy(
      yieldInfo?.yield_info.filter((y) => y.percent_rate).length ?? 0,
    );

    return burnRate;
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

  {#if $selectedLandMeta}
    <LandOverview land={$selectedLandMeta} />
  {/if}

  {#if formattedYields.length > 0}
    <div class="yield-info flex flex-col items-center">
      <div class="text-center pb-2 text-xl">
        Total Tokens Earned
        <div
          class="{totalYieldValue - burnRate >= 0
            ? 'text-green-500'
            : 'text-red-500'} text-2xl"
        >
          {totalYieldValue - burnRate >= 0 ? '+ ' : '- '}{Math.abs(
            totalYieldValue - burnRate,
          ).toFixed(2)}
        </div>
      </div>

      <div class="flex w-full justify-between">
        <div class="flex flex-col items-center">
          <div class="text-xs">Earning / day :</div>
          <div class="text-green-500 text-sm">
            + {totalYieldValue.toFixed(2)}
          </div>
        </div>

        <div class="flex flex-col items-center">
          <div class="text-xs">Burning / day :</div>
          <div class="text-red-500 text-sm">+ {burnRate.toFixed(2)}</div>
        </div>
      </div>
      <div class="flex text-xs justify-between w-full pt-2">
        <div>Token :</div>
        <div>${land?.token?.symbol}</div>
      </div>
    </div>
  {/if}
</div>
