<script lang="ts">
  import type { BaseLand, LandWithActions } from '$lib/api/land';
  import type { Neighbors } from '$lib/api/neighbors';
  import LandNukeShield from '$lib/components/+game-map/land/land-nuke-shield.svelte';
  import { Label } from '$lib/components/ui/label';
  import { Slider } from '$lib/components/ui/slider';
  import type { Token } from '$lib/interfaces';
  import { createLandWithActions } from '$lib/utils/land-actions';
  import {
    calculateBurnRate,
    calculateTaxes,
    estimateNukeTime,
  } from '$lib/utils/taxes';
  import BuyInsightsNeighborGrid from '../tax-impact/buy-insights-neighbor-grid.svelte';

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
      taxes = Number(calculateBurnRate(land, 1));
    }
  });

  let neighbors: Neighbors = $derived(land?.getNeighbors());

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

<Label class="font-semibold text-xl mt-3">Neighborhood Overview</Label>
<div class="flex w-full justify-between items-center gap-4">
  <div class="w-64 flex items-center justify-center">
    {#if filteredNeighbors}
      <BuyInsightsNeighborGrid {filteredNeighbors} {selectedToken} />
    {/if}
  </div>
  <div class="w-full flex flex-col gap-4 mr-8">
    <div class="w-full text-stroke-none flex flex-col leading-4 mt-3">
      <div class="flex justify-between">
        <p class="opacity-50">Per Neighbors</p>
        <p>
          -{taxes}
          <span class="opacity-50">{selectedToken?.symbol}/h</span>
        </p>
      </div>
      <div class="flex justify-between">
        <p class="opacity-50">Max:</p>
        <p>
          -{Number(taxes) * maxNumberOfNeighbors}
          <span class="opacity-50">{selectedToken?.symbol}/h</span>
        </p>
      </div>
      <div class="flex justify-between">
        <p class="">
          <span class="opacity-50"> For </span>
          {nbNeighbors}
          <span class="opacity-50"> neighbors: </span>
        </p>
        <p class="text-right">
          -{Number(taxes) * nbNeighbors}
          <span class="opacity-50">{selectedToken?.symbol}/h</span>
        </p>
      </div>
    </div>

    <div class="flex flex-col gap-4">
      <div class="flex justify-between text-gray-400">
        {#each Array(8) as _, i}
          <span
            class={i + 1 == neighbors.getBaseLandsArray().length
              ? 'text-white font-bold'
              : ''}
          >
            {i + 1}
          </span>
        {/each}
      </div>
      <Slider
        type="single"
        min={1}
        max={8}
        step={1}
        value={nbNeighbors}
        onValueChange={(val) => {
          nbNeighbors = val;
        }}
      />
    </div>
    <div class="flex gap-2 items-center">
      <LandNukeShield
        estimatedNukeTime={estimatedNukeTimeSeconds}
        class="h-10 w-10"
      />
      <div class="flex flex-col gap-1">
        <span>
          <span class="text-gray-400"> nuke in </span>
          {estimatedTimeString}
        </span>

        <span class="">
          {estimatedNukeDate}
        </span>
      </div>
    </div>
  </div>
</div>
