<script lang="ts">
  import type { BaseLand, LandWithActions } from '$lib/api/land';
  import PonziSlider from '$lib/components/ui/ponzi-slider/ponzi-slider.svelte';
  import type { Token } from '$lib/interfaces';
  import { displayCurrency } from '$lib/utils/currency';
  import {
    calculateBurnRate,
    calculateTaxes,
    estimateNukeTime,
  } from '$lib/utils/taxes';
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

  $effect(() => {
    if (sellAmountVal) {
      taxes = calculateTaxes(Number(sellAmountVal));
    } else {
      taxes = Number(calculateBurnRate(land.sellPrice, land.level, 1));
    }
  });

  let neighbors = $derived(land?.getNeighbors());

  const maxNumberOfNeighbors = 8;

  $effect(() => {
    nbNeighbors = neighbors.getBaseLandsArray().length;
  });

  let filteredNeighbors = $derived.by(() => {
    const filteredNeighbors = neighbors
      .getBaseLandsArray()
      .slice(0, nbNeighbors);

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
    if (neighbors.getBaseLandsArray().length < nbNeighbors) {
      console.log('add empty lands');
      const emptyLands = Array(
        nbNeighbors - neighbors.getBaseLandsArray().length,
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
        <div class="opacity-50">Max / h</div>
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
