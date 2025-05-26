<script lang="ts">
  import type { LandWithActions } from '$lib/api/land';
  import { BuildingLand } from '$lib/api/land/building_land';
  import PonziSlider from '$lib/components/ui/ponzi-slider/ponzi-slider.svelte';
  import { Slider } from '$lib/components/ui/slider';
  import type { Token } from '$lib/interfaces';
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
      taxes = Number(calculateBurnRate(land as LandWithActions, 1));
    }
  });

  let neighbors = $derived(land?.getNeighbors());

  const maxNumberOfNeighbors = 8;

  $effect(() => {
    nbNeighbors = neighbors.getNeighbors().length;
  });

  let filteredNeighbors = $derived.by(() => {
    const filteredNeighbors = neighbors.getNeighbors().slice(0, nbNeighbors);

    let up: LandWithActions | undefined | null = filteredNeighbors.find(
      (land) => land == neighbors.getUp(),
    );
    let upRight: LandWithActions | undefined | null = filteredNeighbors.find(
      (land) => land == neighbors.getUpRight(),
    );
    let right: LandWithActions | undefined | null = filteredNeighbors.find(
      (land) => land == neighbors.getRight(),
    );
    let downRight: LandWithActions | undefined | null = filteredNeighbors.find(
      (land) => land == neighbors.getDownRight(),
    );
    let down: LandWithActions | undefined | null = filteredNeighbors.find(
      (land) => land == neighbors.getDown(),
    );
    let downLeft: LandWithActions | undefined | null = filteredNeighbors.find(
      (land) => land == neighbors.getDownLeft(),
    );
    let left: LandWithActions | undefined | null = filteredNeighbors.find(
      (land) => land == neighbors.getLeft(),
    );
    let upLeft: LandWithActions | undefined | null = filteredNeighbors.find(
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
      estimatedNukeTimeSeconds = estimateNukeTime(land);
    }
  });

  let estimatedTimeString = $derived.by(() => {
    const time = estimatedNukeTimeSeconds;

    if (time == 0) {
      return '0s';
    }
    // format seconds to dd hh mm ss
    const days = Math.floor(time / (3600 * 24));
    const hours = Math.floor((time % (3600 * 24)) / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);

    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
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
  </div>
</div>
