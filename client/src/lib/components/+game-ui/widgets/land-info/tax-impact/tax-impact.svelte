<script lang="ts">
  import type { BaseLand, LandWithActions } from '$lib/api/land';
  import PonziSlider from '$lib/components/ui/ponzi-slider/ponzi-slider.svelte';
  import TokenAvatar from '$lib/components/ui/token-avatar/token-avatar.svelte';
  import type { Token, LandYieldInfo } from '$lib/interfaces';
  import { displayCurrency } from '$lib/utils/currency';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { padAddress, toHexWithPadding } from '$lib/utils';
  import { getTokenPrices } from '$lib/api/defi/ekubo/requests';
  import {
    calculateBurnRate,
    calculateTaxes,
    estimateNukeTime,
  } from '$lib/utils/taxes';
  import data from '$profileData';
  import BuyInsightsNeighborGrid from './buy-insights-neighbor-grid.svelte';

  let {
    sellAmountVal = undefined,
    stakeAmountVal = undefined,
    selectedToken,
    land,
  }: {
    sellAmountVal?: string;
    stakeAmountVal?: string;
    selectedToken: Token | undefined;
    land: LandWithActions;
  } = $props();

  let nbNeighbors = $state(0);

  let taxes = $state(0); // 1 neighbor as this is per neighbor

  const BASE_TOKEN = data.mainCurrencyAddress;
  
  let baseToken = $derived(
    data.availableTokens.find((token) => token.address === BASE_TOKEN),
  );

  let yieldInfo: LandYieldInfo | undefined = $state(undefined);
  let tokenPrices = $state<
    { symbol: string; address: string; ratio: number | null }[]
  >([]);
  let totalYieldValue: number = $state(0);

  $effect(() => {
    if (sellAmountVal) {
      taxes = calculateTaxes(Number(sellAmountVal));
    } else {
      taxes = Number(calculateBurnRate(land as LandWithActions, 1));
    }
  });

  let neighbors = $derived(land?.getNeighbors());

  const maxNumberOfNeighbors = 8;

  $effect(() => {
    nbNeighbors = neighbors.getNeighbors().length;
  });

  // Fetch yield information (similar to overall-tab.svelte)
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
          Object.entries(yieldInfo.yield_info).forEach(
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
              if (priceInfo?.ratio !== null && priceInfo) {
                totalValue += Number(
                  amount.rawValue().dividedBy(priceInfo.ratio || 0),
                );
              } else {
                totalValue += Number(amount.rawValue());
              }
            },
          );
        }
        totalYieldValue = totalValue;
      });
    });
  });

  let filteredNeighbors = $derived.by(() => {
    const filteredNeighbors = neighbors.getNeighbors().slice(0, nbNeighbors);

    let up: BaseLand | undefined | null = filteredNeighbors.find(
      (land) => land == neighbors.getUp(),
    );
    let upRight: BaseLand | undefined | null = filteredNeighbors.find(
      (land) => land == neighbors.getUpRight(),
    );
    let right: BaseLand | undefined | null = filteredNeighbors.find(
      (land) => land == neighbors.getRight(),
    );
    let downRight: BaseLand | undefined | null = filteredNeighbors.find(
      (land) => land == neighbors.getDownRight(),
    );
    let down: BaseLand | undefined | null = filteredNeighbors.find(
      (land) => land == neighbors.getDown(),
    );
    let downLeft: BaseLand | undefined | null = filteredNeighbors.find(
      (land) => land == neighbors.getDownLeft(),
    );
    let left: BaseLand | undefined | null = filteredNeighbors.find(
      (land) => land == neighbors.getLeft(),
    );
    let upLeft: BaseLand | undefined | null = filteredNeighbors.find(
      (land) => land == neighbors.getUpLeft(),
    );

    // Add empty lands in function of the number of neighbors
    if (neighbors.getNeighbors().length < nbNeighbors) {
      console.log('add empty lands');
      const emptyLands = Array(
        nbNeighbors - neighbors.getNeighbors().length,
      ).fill(null);

      // find wich direction to add the empty land
      emptyLands.forEach((_, i) => {
        if (upLeft === undefined) {
          upLeft = null;
        } else if (up === undefined) {
          up = null;
        } else if (upRight === undefined) {
          upRight = null;
        } else if (right === undefined) {
          right = null;
        } else if (downRight === undefined) {
          downRight = null;
        } else if (down === undefined) {
          down = null;
        } else if (downLeft === undefined) {
          downLeft = null;
        } else if (left === undefined) {
          left = null;
        }
      });
    }

    return {
      array: filteredNeighbors,
      up,
      upRight,
      right,
      downRight,
      down,
      downLeft,
      left,
      upLeft,
    };
  });

  let estimatedNukeTimeSeconds = $state(0);

  $effect(() => {
    if (stakeAmountVal) {
      let remainingHours = Number(stakeAmountVal) / (taxes * nbNeighbors);
      let remainingSeconds = remainingHours * 3600;

      const now = Date.now() / 1000;
      const remainingNukeTimeFromNow = remainingSeconds;

      estimatedNukeTimeSeconds = remainingNukeTimeFromNow;
    } else {
      estimateNukeTime(land).then((time) => {
        estimatedNukeTimeSeconds = time;
      });
    }
  });

  let estimatedTimeString = $derived.by(() => {
    const time = estimatedNukeTimeSeconds;

    if (time === 0) {
      return '0s';
    }

    const days = Math.floor(time / (3600 * 24));
    const hours = Math.floor((time % (3600 * 24)) / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);

    const parts = [
      days ? `${days}d` : '',
      hours ? `${hours}h` : '',
      minutes ? `${minutes}m` : '',
      seconds ? `${seconds}s` : '',
    ];

    const final = parts.filter(Boolean).join(' ');
    if (!final) {
      return 'Now !!!';
    }
    return final;
  });

  let estimatedNukeDate = $derived.by(() => {
    const time = estimatedNukeTimeSeconds;

    if (time == 0) {
      return '';
    }

    const date = new Date();
    date.setSeconds(date.getSeconds() + time);
    return date.toLocaleString();
  });
</script>

<div class="w-full flex flex-col gap-2">
  <h2 class="font-ponzi-number">Neighborhood Tax Impact</h2>
  <p class="leading-none -mt-1 opacity-75">
    You can get an estimation of your land survival time in function of its
    neighbors
  </p>

  <!-- Potential Yield Display -->
  <div class="flex w-full justify-center select-text bg-[#1E1E2D] rounded px-4 py-2">
    <div class="flex flex-col items-center text-ponzi-number">
      <div class="opacity-50 text-sm">Potential Yield / hour :</div>
      <div class="text-green-500 flex items-center gap-2">
        <span class="text-xl stroke-3d-black"
          >+ {displayCurrency(totalYieldValue)}</span
        >
        <TokenAvatar token={baseToken} class="border border-white w-5 h-5" />
      </div>
    </div>
  </div>
  <div class="flex gap-2">
    <div>
      {#if filteredNeighbors}
        <BuyInsightsNeighborGrid {filteredNeighbors} {selectedToken} />
      {/if}
    </div>
    <PonziSlider bind:value={nbNeighbors} />
    <div class="flex flex-col flex-1 ml-4 justify-center tracking-wide">
      <div
        class="flex justify-between font-ponzi-number select-text text-xs items-end"
      >
        <div>
          <span class="opacity-50">For</span>
          <span class="text-xl text-blue-300 leading-none">{nbNeighbors}</span>
          <span class="opacity-50"> neighbors </span>
        </div>
        <div class="text-red-500">
          -{displayCurrency(Number(taxes) * nbNeighbors)}
          {selectedToken?.symbol}
        </div>
      </div>
      <hr class="my-1 opacity-50" />
      
      <!-- Net Yield for Selected Neighbors -->
      <div
        class="flex justify-between font-ponzi-number select-text text-xs items-end"
      >
        <div>
          <span class="opacity-50">Net yield with</span>
          <span class="text-blue-300 leading-none">{nbNeighbors}</span>
          <span class="opacity-50"> neighbors</span>
        </div>
        <div class="{totalYieldValue - (Number(taxes) * nbNeighbors) >= 0 ? 'text-green-500' : 'text-red-500'} flex items-center gap-1">
          <span>
            {totalYieldValue - (Number(taxes) * nbNeighbors) >= 0 ? '+' : '-'}
            {displayCurrency(Math.abs(totalYieldValue - (Number(taxes) * nbNeighbors)))}
          </span>
          <TokenAvatar token={baseToken} class="border border-white w-3 h-3" />
        </div>
      </div>
      
      <!-- Max Net Yield -->
      <div
        class="flex justify-between font-ponzi-number select-text text-xs items-end"
      >
        <div>
          <span class="opacity-50">Max net yield</span>
          <span class="opacity-50"> (8 neighbors)</span>
        </div>
        <div class="{totalYieldValue - (Number(taxes) * maxNumberOfNeighbors) >= 0 ? 'text-green-500' : 'text-red-500'} flex items-center gap-1">
          <span>
            {totalYieldValue - (Number(taxes) * maxNumberOfNeighbors) >= 0 ? '+' : '-'}
            {displayCurrency(Math.abs(totalYieldValue - (Number(taxes) * maxNumberOfNeighbors)))}
          </span>
          <TokenAvatar token={baseToken} class="border border-white w-3 h-3" />
        </div>
      </div>

      <hr class="my-1 opacity-50" />
      
      <div
        class="flex justify-between font-ponzi-number select-text text-xs items-end"
      >
        <div class="opacity-50">Per neighbors / h</div>
        <div class="text-red-500">
          -{displayCurrency(Number(taxes))}
          {selectedToken?.symbol}
        </div>
      </div>
      <div
        class="flex justify-between font-ponzi-number select-text text-xs items-end"
      >
        <div class="opacity-50">Max tax / h</div>
        <div class="text-red-500">
          -{displayCurrency(Number(taxes) * maxNumberOfNeighbors)}
          {selectedToken?.symbol}
        </div>
      </div>
      <div
        class="flex justify-between font-ponzi-number select-text text-xs items-end"
      >
        <div>
          <span class="opacity-50">Nuke time with</span>
          <span class="text-blue-300 leading-none">{nbNeighbors}</span>
          <span class="opacity-50"> neighbors </span>
        </div>
        <div
          class=" {estimatedTimeString.includes('Now')
            ? 'text-red-500'
            : 'text-green-500'}"
        >
          {estimatedTimeString}
        </div>
      </div>
    </div>
  </div>
</div>
