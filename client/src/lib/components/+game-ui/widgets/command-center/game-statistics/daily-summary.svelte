<script lang="ts">
  import type { LandWithActions } from '$lib/api/land';
  import { settingsStore } from '$lib/stores/settings.store.svelte';
  import { walletStore } from '$lib/stores/wallet.svelte';
  import { displayCurrency } from '$lib/utils/currency';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { calculateBurnRate } from '$lib/utils/taxes';
  import { toHexWithPadding } from '$lib/utils';
  import { untrack } from 'svelte';
  import data from '$profileData';

  interface Props {
    lands: LandWithActions[];
  }

  let { lands }: Props = $props();

  let baseToken = $derived.by(() => {
    const selectedAddress = settingsStore.selectedBaseTokenAddress;
    const targetAddress = selectedAddress || data.mainCurrencyAddress;
    return data.availableTokens.find(
      (token) => token.address === targetAddress,
    );
  });

  interface DailyStats {
    totalEarnings: number;
    totalCosts: number;
    netEarnings: number;
  }

  let statsPromise = $state<Promise<DailyStats> | null>(null);

  // Track which lands we've calculated for to prevent re-runs
  let calculatedForLandsKey = $state('');

  // Effect to calculate daily stats when lands change
  $effect(() => {
    // Create a key based on land locations to detect actual changes
    const landsKey = lands.map((l) => l.location).join(',');
    const currentBaseToken = baseToken;

    // Skip if already calculated for these lands
    if (landsKey === untrack(() => calculatedForLandsKey)) {
      return;
    }

    calculatedForLandsKey = landsKey;

    if (!lands.length || !currentBaseToken) {
      statsPromise = Promise.resolve({
        totalEarnings: 0,
        totalCosts: 0,
        netEarnings: 0,
      });
      return;
    }

    const landsToProcess = [...lands];
    const tokenForCalc = currentBaseToken;

    statsPromise = Promise.all(
      landsToProcess.map(async (land) => {
        try {
          // Get yield info for this land
          const yieldInfo = await land.getYieldInfo(false);
          let landEarnings = 0;

          // Calculate total yield value in base token
          if (yieldInfo?.yield_info && tokenForCalc) {
            for (const yieldData of yieldInfo.yield_info) {
              const tokenHexAddress = toHexWithPadding(yieldData.token);
              const tokenData = data.availableTokens.find(
                (token) => token.address === tokenHexAddress,
              );

              if (tokenData) {
                const amount = CurrencyAmount.fromUnscaled(
                  yieldData.per_hour,
                  tokenData,
                );
                const baseValue = walletStore.convertTokenAmount(
                  amount,
                  tokenData,
                  tokenForCalc,
                );
                if (baseValue) {
                  landEarnings += Number(baseValue.rawValue());
                }
              }
            }
          }

          // Calculate burn rate for this land
          const neighborCount =
            yieldInfo?.yield_info.filter((info) => info.percent_rate).length ||
            0;
          const burnRate = calculateBurnRate(
            land.sellPrice,
            land.level,
            neighborCount,
          );

          // Convert burn rate to base token
          let landCosts = 0;
          if (land.token && tokenForCalc) {
            const burnRateAmount = CurrencyAmount.fromScaled(
              burnRate.toNumber(),
              land.token,
            );
            const convertedBurnRate = walletStore.convertTokenAmount(
              burnRateAmount,
              land.token,
              tokenForCalc,
            );
            if (convertedBurnRate) {
              landCosts = Number(convertedBurnRate.rawValue());
            }
          }

          return { earnings: landEarnings, costs: landCosts };
        } catch (error) {
          console.error('Error calculating stats for land:', error);
          return { earnings: 0, costs: 0 };
        }
      }),
    ).then((results) => {
      const totalEarningsPerHour = results.reduce(
        (sum, r) => sum + r.earnings,
        0,
      );
      const totalCostsPerHour = results.reduce((sum, r) => sum + r.costs, 0);

      // Multiply by 24 for daily values
      return {
        totalEarnings: totalEarningsPerHour * 24,
        totalCosts: totalCostsPerHour * 24,
        netEarnings: (totalEarningsPerHour - totalCostsPerHour) * 24,
      };
    });
  });
</script>

<div class="flex flex-col gap-3">
  <div class="text-sm font-semibold opacity-70 flex items-center gap-2">
    <img src="/ui/icons/IconTiny_Stats.png" alt="Stats" class="h-4 w-4" />
    Daily Summary
  </div>

  {#if lands.length === 0}
    <div class="text-center text-sm opacity-50">No lands owned</div>
  {:else}
    {#await statsPromise}
      <div class="text-center text-sm opacity-50">Calculating...</div>
    {:then stats}
      {#if stats}
        <div class="flex flex-col gap-2 bg-black/20 rounded-lg p-3">
          <!-- Net Earnings - Top Center -->
          <div class="flex w-full justify-center">
            <div class="text-center pb-2 font-ponzi-number">
              <span class="opacity-50 text-sm">Net Earnings / Day:</span>
              <div
                class="text-2xl {stats.netEarnings >= 0
                  ? 'text-green-500'
                  : 'text-red-500'}"
              >
                {stats.netEarnings >= 0 ? '+' : '-'}{displayCurrency(
                  Math.abs(stats.netEarnings),
                )} $
              </div>
            </div>
          </div>

          <!-- Earnings Left, Cost Right -->
          <div class="flex w-full justify-between">
            <div class="flex flex-col items-center font-ponzi-number">
              <div class="opacity-50 text-sm">Earnings / Day:</div>
              <div class="text-green-500 text-xl">
                +&nbsp;{displayCurrency(stats.totalEarnings)} $
              </div>
            </div>
            <div class="flex flex-col items-center font-ponzi-number">
              <div class="opacity-50 text-sm">Cost / Day:</div>
              <div class="text-red-500 text-xl">
                -&nbsp;{displayCurrency(stats.totalCosts)} $
              </div>
            </div>
          </div>
        </div>
      {/if}
    {:catch}
      <div class="text-center text-sm opacity-50">Error calculating stats</div>
    {/await}
  {/if}
</div>
