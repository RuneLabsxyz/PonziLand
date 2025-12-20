<script lang="ts">
  import type { LandWithActions } from '$lib/api/land';
  import type { Token } from '$lib/interfaces';
  import TokenAvatar from '$lib/components/ui/token-avatar/token-avatar.svelte';
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

  interface TokenStats {
    token: Token;
    buildingCount: number;
    earnings: number;
    costs: number;
    net: number;
  }

  let tokenStats = $state<{
    stats: TokenStats[];
    isLoading: boolean;
  }>({
    stats: [],
    isLoading: true,
  });

  let calculatedForLandsKey = $state('');

  $effect(() => {
    const landsKey = lands.map((l) => l.location).join(',');
    const currentBaseToken = baseToken;

    if (
      landsKey === untrack(() => calculatedForLandsKey) ||
      untrack(() => tokenStats.isLoading && calculatedForLandsKey !== '')
    ) {
      return;
    }

    if (!lands.length || !currentBaseToken) {
      tokenStats = { stats: [], isLoading: false };
      calculatedForLandsKey = landsKey;
      return;
    }

    calculatedForLandsKey = landsKey;
    tokenStats = { ...untrack(() => tokenStats), isLoading: true };

    const landsToProcess = [...lands];
    const tokenForCalc = currentBaseToken;

    // Group lands by token
    const landsByToken = new Map<string, LandWithActions[]>();
    for (const land of landsToProcess) {
      if (!land.token) continue;
      const key = land.token.address;
      const existing = landsByToken.get(key);
      if (existing) {
        existing.push(land);
      } else {
        landsByToken.set(key, [land]);
      }
    }

    // Calculate stats for each token group
    Promise.all(
      [...landsByToken.entries()].map(async ([tokenAddress, tokenLands]) => {
        const token = tokenLands[0].token!;
        let totalEarnings = 0;
        let totalCosts = 0;

        for (const land of tokenLands) {
          try {
            const yieldInfo = await land.getYieldInfo(false);

            // Calculate earnings
            if (yieldInfo?.yield_info && tokenForCalc) {
              for (const yieldData of yieldInfo.yield_info) {
                const tokenHexAddress = toHexWithPadding(yieldData.token);
                const tokenData = data.availableTokens.find(
                  (t) => t.address === tokenHexAddress,
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
                    totalEarnings += Number(baseValue.rawValue());
                  }
                }
              }
            }

            // Calculate burn rate
            const neighborCount =
              yieldInfo?.yield_info.filter((info) => info.percent_rate)
                .length || 0;
            const burnRate = calculateBurnRate(
              land.sellPrice,
              land.level,
              neighborCount,
            );

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
                totalCosts += Number(convertedBurnRate.rawValue());
              }
            }
          } catch (error) {
            console.error('Error calculating stats for land:', error);
          }
        }

        return {
          token,
          buildingCount: tokenLands.length,
          earnings: totalEarnings * 24,
          costs: totalCosts * 24,
          net: (totalEarnings - totalCosts) * 24,
        };
      }),
    ).then((results) => {
      // Sort by building count descending
      results.sort((a, b) => b.buildingCount - a.buildingCount);
      tokenStats = { stats: results, isLoading: false };
    });
  });
</script>

<div class="flex flex-col gap-3">
  <div class="text-sm font-semibold opacity-70 flex items-center gap-2">
    <img src="/ui/icons/Icon_Crown.png" alt="Crown" class="h-4 w-4" />
    Token Breakdown
  </div>

  {#if tokenStats.isLoading}
    <div class="text-center text-sm opacity-50">Calculating...</div>
  {:else if tokenStats.stats.length === 0}
    <div class="text-center text-sm opacity-50">No lands owned</div>
  {:else}
    <div class="flex flex-col gap-2 max-h-[220px] overflow-y-auto">
      {#each tokenStats.stats as stat}
        <div class="bg-black/20 rounded-lg p-3">
          <!-- Token header with count -->
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <TokenAvatar token={stat.token} class="h-5 w-5" />
              <span class="font-ponzi-number text-sm">
                {stat.token.symbol}
              </span>
            </div>
            <span class="opacity-50 text-xs">
              {stat.buildingCount} building{stat.buildingCount > 1 ? 's' : ''}
            </span>
          </div>

          <!-- Stats row -->
          <div class="flex justify-between text-xs">
            <div class="flex flex-col items-start">
              <span class="opacity-50">Earnings</span>
              <span class="text-green-500 font-ponzi-number">
                +{displayCurrency(stat.earnings)} $
              </span>
            </div>
            <div class="flex flex-col items-center">
              <span class="opacity-50">Net</span>
              <span
                class="font-ponzi-number {stat.net >= 0
                  ? 'text-green-500'
                  : 'text-red-500'}"
              >
                {stat.net >= 0 ? '+' : ''}{displayCurrency(stat.net)} $
              </span>
            </div>
            <div class="flex flex-col items-end">
              <span class="opacity-50">Cost</span>
              <span class="text-red-500 font-ponzi-number">
                -{displayCurrency(stat.costs)} $
              </span>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
