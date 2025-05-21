<script lang="ts">
  import { getTokenPrices } from '$lib/api/defi/ekubo/requests';
  import type { LandWithActions } from '$lib/api/land.svelte';
  import type { LandYieldInfo } from '$lib/interfaces';
  import { settingsStore } from '$lib/stores/settings.store.svelte';
  import { toHexWithPadding } from '$lib/utils';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { calculateBurnRate } from '$lib/utils/taxes';
  import data from '$profileData';
  import LandOverview from '../land-overview.svelte';
  import LandHudNormal from './land-hud-normal.svelte';
  import LandHudPro from './land-hud-pro.svelte';

  const BASE_TOKEN = data.mainCurrencyAddress;

  let {
    land,
    isOwner,
    showLand,
  }: {
    land: LandWithActions;
    isOwner: boolean;
    showLand: boolean;
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

<div class="flex flex-row">
  <div class="py-4 pl-4">
    {#if showLand}
      <LandOverview {land} {isOwner} />
    {/if}
  </div>
  {#if settingsStore.isProMode}
    <LandHudNormal {yieldInfo} {burnRate} {land} />
  {:else if land}
    <LandHudPro {totalYieldValue} burnRate={burnRateInBaseToken} {land} />
  {/if}
</div>
