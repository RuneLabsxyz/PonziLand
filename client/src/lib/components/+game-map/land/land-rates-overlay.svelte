<script lang="ts">
  import type { LandWithActions } from '$lib/api/land';
  import { Arrow } from '$lib/components/ui/arrows';
  import RotatingCoin from '$lib/components/loading-screen/rotating-coin.svelte';
  import type { Token } from '$lib/interfaces';
  import { displayCurrency } from '$lib/utils/currency';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { calculateBurnRate, getNeighbourYieldArray } from '$lib/utils/taxes';
  import { walletStore } from '$lib/stores/wallet.svelte';
  import { settingsStore } from '$lib/stores/settings.store.svelte';
  import { getOutlineControls } from '$lib/components/+game-map/three/utils/outline-controls.store.svelte';
  import { Neighbors } from '$lib/api/neighbors';
  import { onDestroy } from 'svelte';
  import data from '$profileData';

  let {
    land,
  }: {
    land: LandWithActions;
  } = $props();

  let yieldInfo = $state<
    ({
      token: Token | undefined;
      sell_price: bigint;
      percent_rate: bigint;
      location: bigint;
      per_hour: bigint;
    } | null)[]
  >([]);

  let isLoading = $state(false);

  let numberOfNeighbours = $derived(
    yieldInfo.filter((info) => (info?.percent_rate ?? 0n) !== 0n).length,
  );

  let tokenBurnRate = $derived(
    land.type === 'auction'
      ? 0n
      : calculateBurnRate(land.sellPrice, land.level, numberOfNeighbours),
  );

  let displayBurnRate = $derived.by(() => {
    if (land.type === 'auction') {
      return {
        amount: '',
        symbol: '???',
      };
    }

    if (settingsStore.showRatesInBaseToken && baseToken && land.token) {
      const burnAmount = CurrencyAmount.fromScaled(
        Number(tokenBurnRate),
        land.token,
      );
      const baseValue = walletStore.convertTokenAmount(
        burnAmount,
        land.token,
        baseToken,
      );

      if (baseValue) {
        const symbol = baseToken.symbol === 'USDC' ? '$' : baseToken.symbol;
        return {
          amount: displayCurrency(baseValue.rawValue()),
          symbol: symbol,
        };
      } else {
        return null;
      }
    } else {
      const symbol =
        land.token?.symbol === 'USDC' ? '$' : land.token?.symbol || 'UNKNOWN';
      return {
        amount: displayCurrency(Number(tokenBurnRate)),
        symbol: symbol,
      };
    }
  });

  let baseToken = $derived.by(() => {
    const selectedAddress = settingsStore.selectedBaseTokenAddress;
    const targetAddress = selectedAddress || data.mainCurrencyAddress;
    return data.availableTokens.find(
      (token) => token.address === targetAddress,
    );
  });

  function getYieldValueInBaseToken(info: any): CurrencyAmount | null {
    if (!info?.token || !baseToken) return null;

    const amount = CurrencyAmount.fromUnscaled(info.per_hour, info.token);
    const baseValue = walletStore.convertTokenAmount(
      amount,
      info.token,
      baseToken,
    );

    return baseValue || null;
  }

  let displayYields = $derived.by(() => {
    return yieldInfo.map((info) => {
      if (!info?.token) return { amount: '0', symbol: '' };

      if (settingsStore.showRatesInBaseToken && baseToken) {
        const baseAmount = getYieldValueInBaseToken(info);
        if (baseAmount) {
          const symbol = baseToken.symbol === 'USDC' ? '$' : baseToken.symbol;
          return {
            amount: displayCurrency(baseAmount.rawValue()),
            symbol: symbol,
          };
        } else {
          return null;
        }
      } else {
        const amount = CurrencyAmount.fromUnscaled(info.per_hour, info.token);
        const symbol = info.token.symbol === 'USDC' ? '$' : info.token.symbol;
        return {
          amount: displayCurrency(amount.rawValue()),
          symbol: symbol,
        };
      }
    });
  });

  // Calculate yield scaling once per land
  let yieldScaling = $derived(() => {
    const yieldItems = yieldInfo
      .filter((neighbor) => neighbor?.token && neighbor.per_hour > 0n)
      .map((neighbor) => ({
        neighbor,
        baseAmount: getYieldValueInBaseToken(neighbor),
      }));

    const validYields = yieldItems.filter(
      (item) => item.baseAmount && !item.baseAmount.isZero(),
    );
    const hasUnconvertibleYields = yieldItems.some((item) => !item.baseAmount);

    // If we can't convert some yields to base token, use uniform scale for all
    if (hasUnconvertibleYields || validYields.length <= 1) {
      return new Map(yieldItems.map((item) => [item.neighbor, 1]));
    }

    const allValues = validYields.map((item) =>
      Number(item.baseAmount!.rawValue()),
    );
    const minYield = Math.min(...allValues);
    const maxYield = Math.max(...allValues);

    if (maxYield === minYield) {
      // All yields are the same, use normal scale
      return new Map(validYields.map((item) => [item.neighbor, 1]));
    }

    // Scale between 0.5x (smallest yield) and 1.5x (biggest yield)
    return new Map(
      validYields.map((item) => {
        const baseValue = Number(item.baseAmount!.rawValue());
        const normalizedValue = (baseValue - minYield) / (maxYield - minYield);
        const scale = 0.5 + normalizedValue * 1.0; // Scale from 0.5 to 1.5
        return [item.neighbor, scale];
      }),
    );
  });

  function getArrowScale(info: any): number {
    return yieldScaling().get(info) || 0;
  }

  // Calculate total earnings per hour from all neighbors with yield
  let totalEarningsPerHour = $derived.by(() => {
    let total = 0;

    yieldInfo.forEach((info) => {
      if (info?.token && info.per_hour > 0n) {
        if (settingsStore.showRatesInBaseToken && baseToken) {
          const baseAmount = getYieldValueInBaseToken(info);
          if (baseAmount) {
            total += Number(baseAmount.rawValue());
          }
        } else {
          const amount = CurrencyAmount.fromUnscaled(info.per_hour, info.token);
          total += Number(amount.rawValue());
        }
      }
    });

    return total;
  });

  // Calculate net yield (total earnings - burn rate)
  let netYield = $derived.by(() => {
    if (land.type === 'auction') {
      return totalEarningsPerHour;
    }

    // force conversion
    if (baseToken && land.token) {
      const burnAmount = CurrencyAmount.fromScaled(
        Number(tokenBurnRate),
        land.token,
      );
      const baseBurnValue = walletStore.convertTokenAmount(
        burnAmount,
        land.token,
        baseToken,
      );

      if (baseBurnValue) {
        return totalEarningsPerHour - Number(baseBurnValue.rawValue());
      }
    } else {
      return totalEarningsPerHour - Number(tokenBurnRate);
    }

    return totalEarningsPerHour - Number(tokenBurnRate);
  });

  // Get display values for center tile
  let centerTileDisplay = $derived.by(() => {
    const tokenSymbol =
      settingsStore.showRatesInBaseToken && baseToken
        ? baseToken.symbol
        : land.token?.symbol || 'UNKNOWN';

    const displaySymbol = tokenSymbol === 'USDC' ? '$' : tokenSymbol;

    return {
      totalEarnings: {
        amount: displayCurrency(totalEarningsPerHour),
        symbol: displaySymbol,
      },
      burnRate: displayBurnRate,
      netYield: {
        amount: displayCurrency(Math.abs(netYield)),
        symbol: displaySymbol,
        isPositive: netYield >= 0,
      },
    };
  });

  $effect(() => {
    if (land) {
      isLoading = true;
      yieldInfo = [];
      getNeighbourYieldArray(land, false).then((res) => {
        yieldInfo = res;
        yieldInfo.splice(4, 0, null);
        isLoading = false;
      });
    }
  });

  // Effect to apply stripes to neighbor lands with actual yield
  $effect(() => {
    if (land && yieldInfo.length > 0) {
      const outlineStore = getOutlineControls();

      // Get neighbor locations
      const neighborsData = Neighbors.getLocations(BigInt(land.location));
      const allNeighborIndices = neighborsData.array.map((loc) => Number(loc));

      // Filter neighbors to only include those with actual yield (token and per_hour > 0)
      const neighborsWithYield: number[] = [];

      yieldInfo.forEach((info, i) => {
        // Skip index 4 (center/selected land) and only include neighbors with actual yield
        if (i !== 4 && info?.token && info.per_hour > 0n) {
          // Map yieldInfo index to neighbor location index
          const neighborIndex = allNeighborIndices[i > 4 ? i - 1 : i]; // Adjust for center being at index 4
          if (neighborIndex !== undefined) {
            neighborsWithYield.push(neighborIndex);
          }
        }
      });

      const selectedLandIndex = Number(land.location);

      // Apply stripes to selected land and yielding neighbors on both building and biome layers
      if (outlineStore.buildingControls && outlineStore.buildingSprite) {
        outlineStore.buildingControls.setStripedLands(
          outlineStore.buildingSprite,
          neighborsWithYield,
          selectedLandIndex,
        );
      }

      if (outlineStore.biomeControls && outlineStore.biomeSprite) {
        outlineStore.biomeControls.setStripedLands(
          outlineStore.biomeSprite,
          neighborsWithYield,
          selectedLandIndex,
        );
      }

      console.log(
        `Striped ${neighborsWithYield.length} neighbors with yield out of ${allNeighborIndices.length} total neighbors`,
      );
    }
  });

  // Cleanup stripes when component unmounts
  onDestroy(() => {
    const outlineStore = getOutlineControls();

    // Clear stripes from both layers
    if (outlineStore.buildingControls && outlineStore.buildingSprite) {
      outlineStore.buildingControls.clearStripedLands(
        outlineStore.buildingSprite,
      );
    }

    if (outlineStore.biomeControls && outlineStore.biomeSprite) {
      outlineStore.biomeControls.clearStripedLands(outlineStore.biomeSprite);
    }
  });
</script>

<div
  class="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none z-20 tracking-wider"
  style="transform: translate(-150px, -150px); width: 300px; height: 300px;"
>
  {#if isLoading}
    <div class="col-span-3 row-span-3 flex items-center justify-center">
      <RotatingCoin />
    </div>
  {:else}
    {#each yieldInfo as info, i}
      {#if info?.token && displayYields[i] && displayYields[i].amount !== '0'}
        <div
          class="text-ponzi-number text-[8px] flex items-center justify-center leading-none"
        >
          <span class="whitespace-nowrap text-[#A0EA68]">
            +{displayYields[i].amount}{displayYields[i].symbol}
          </span>
        </div>
      {:else if i === 4 && (centerTileDisplay.totalEarnings.amount !== '0' || (centerTileDisplay.burnRate && centerTileDisplay.burnRate.amount !== '0'))}
        <div
          class="text-ponzi-number text-[8px] flex flex-col items-center justify-center leading-tight gap-0.5 relative"
        >
          <!-- Total Earnings -->
          {#if centerTileDisplay.totalEarnings.amount !== '0'}
            <span class="whitespace-nowrap text-green-400">
              +{centerTileDisplay.totalEarnings.amount}{centerTileDisplay
                .totalEarnings.symbol}
            </span>
          {/if}
          <!-- Burn Rate -->
          {#if centerTileDisplay.burnRate && centerTileDisplay.burnRate.amount !== '0'}
            <span class="whitespace-nowrap text-orange-500">
              -{centerTileDisplay.burnRate.amount}{centerTileDisplay.burnRate
                .symbol}
            </span>
          {/if}
          <hr
            class=" bg-gray-300 w-10"
            style="filter: drop-shadow(.5px .5px 0px black);"
          />
          <!-- Net Yield -->
          <span
            class="whitespace-nowrap {centerTileDisplay.netYield.isPositive
              ? 'text-[#A0EA68]'
              : 'text-[#F05555]'} font-bold text-[8px]"
          >
            {centerTileDisplay.netYield.isPositive
              ? '+'
              : '-'}{centerTileDisplay.netYield.amount}{centerTileDisplay
              .netYield.symbol}
          </span>
        </div>
      {:else}
        <div
          class="text-ponzi text-[32px] flex items-center justify-center leading-none"
        ></div>
      {/if}

      <!-- Show arrows only for neighbors with actual yields (has token and yield > 0) -->
      {#if info?.token && info.per_hour > 0n}
        {@const scale = getArrowScale(info)}
        <!-- Straight -->
        {#if i === 1}
          <div
            class="absolute top-1/3 left-1/2"
            style="transform: translate(-50%, -50%) rotate(90deg) scale({scale});"
          >
            <Arrow type="straight" class="pr-2 w-8 h-8" />
          </div>
        {/if}
        {#if i === 3}
          <div
            class="absolute top-1/2 left-1/3"
            style="transform: translate(-50%, -50%) scale({scale});"
          >
            <Arrow type="straight" class="pr-2 w-8 h-8" />
          </div>
        {/if}
        {#if i === 5}
          <div
            class="absolute top-1/2 right-1/3"
            style="transform: translate(50%, -50%) rotate(180deg) scale({scale});"
          >
            <Arrow type="straight" class="pr-2 w-8 h-8" />
          </div>
        {/if}
        {#if i === 7}
          <div
            class="absolute bottom-1/3 left-1/2"
            style="transform: translate(-50%, 50%) rotate(-90deg) scale({scale});"
          >
            <Arrow type="straight" class="pr-2 w-8 h-8" />
          </div>
        {/if}

        <!-- Diagonals -->
        {#if i === 0}
          <div
            class="absolute top-1/3 left-1/3"
            style="transform: translate(-50%, -50%) rotate(45deg) scale({scale});"
          >
            <Arrow type="bent" class="pr-2 w-8 h-8" />
          </div>
        {/if}
        {#if i === 2}
          <div
            class="absolute top-1/3 right-1/3"
            style="transform: translate(50%, -50%) rotate(135deg) scale({scale});"
          >
            <Arrow type="bent" class="pr-2 w-8 h-8" />
          </div>
        {/if}
        {#if i === 6}
          <div
            class="absolute bottom-1/3 left-1/3"
            style="transform: translate(-50%, 50%) rotate(-45deg) scale({scale});"
          >
            <Arrow type="bent" class="pr-2 w-8 h-8" />
          </div>
        {/if}
        {#if i === 8}
          <div
            class="absolute bottom-1/3 right-1/3"
            style="transform: translate(50%, 50%) rotate(-135deg) scale({scale});"
          >
            <Arrow type="bent" class="pr-2 w-8 h-8" />
          </div>
        {/if}
      {/if}
    {/each}
  {/if}
</div>
