<script lang="ts">
  import { getTokenPrices } from '$lib/api/defi/ekubo/requests';
  import type { LandWithActions } from '$lib/api/land';
  import LandHudPro from '$lib/components/+game-map/land/hud/land-hud-pro.svelte';
  import type { LandYieldInfo } from '$lib/interfaces';
  import { toHexWithPadding } from '$lib/utils';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { calculateBurnRate } from '$lib/utils/taxes';
  import data from '$profileData';
  import IncreasePrice from './increase-price.svelte';
  import IncreaseStake from './increase-stake.svelte';

  const BASE_TOKEN = data.mainCurrencyAddress;

  let {
    land,
    isActive = false,
  }: { land: LandWithActions; isActive?: boolean } = $props();

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

  let burnRateInBaseToken: CurrencyAmount = $state(
    CurrencyAmount.fromScaled('0'),
  );

  $effect(() => {
    if (tokenPrices) {
      if (land?.token?.address === BASE_TOKEN) {
        burnRateInBaseToken = burnRate;
      } else {
        const tokenPrice = tokenPrices.find(
          (p) => p.address === land?.token?.address,
        );
        if (tokenPrice) {
          burnRateInBaseToken = CurrencyAmount.fromScaled(
            burnRate.dividedBy(tokenPrice.ratio || 0).toString(),
            land?.token,
          );
        }
      }
    }
  });

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

{#if isActive}
  <!-- Overall tab content will go here -->
  <div class="w-full flex flex-col gap-2">
    <div class="flex w-full justify-center">
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
    </div>
    <div class="flex w-full justify-between">
      <div class="flex flex-col items-center text-ponzi-number">
        <div class="">Earning / hour :</div>
        <div class="text-green-500 flex items-center">
          <span>+ {totalYieldValue.toFixed(2)}</span>
          <img src="/tokens/eSTRK/icon.png" alt="" class="ml-1 h-4 w-4" />
        </div>
      </div>
      <div class="flex flex-col items-center text-ponzi-number">
        <div class="">Burning / hour :</div>
        <div class="text-red-500 flex items-center">
          <span>- {burnRate.toString()}</span>
          <img src="/tokens/eSTRK/icon.png" alt="" class="ml-1 h-4 w-4" />
        </div>
      </div>
    </div>
    <div class="flex flex-col gap-2 rounded bg-[#1E1E2D] p-4">
      <div class="w-full flex gap-2 items-center">
        <div class="flex-1 h-[1px] bg-white"></div>
        <div class="">Main informations</div>
        <div class="flex-1 h-[1px] bg-white"></div>
      </div>
      <div class="flex justify-between items-center">
        <div>Token :</div>
        <div>{land?.token?.name}</div>
      </div>
      <div class="flex justify-between items-center">
        <div>Stake Amount :</div>
        <div>{land?.stakeAmount}</div>
      </div>
      <div class="flex justify-between items-center">
        <div>Sell Price :</div>
        <div>{land?.sellPrice}</div>
      </div>
    </div>
    <div class="flex gap-4">
      <div class="w-full">
        <IncreaseStake {land} />
      </div>
      <div class="w-full">
        <IncreasePrice {land} />
      </div>
    </div>
  </div>
{/if}
