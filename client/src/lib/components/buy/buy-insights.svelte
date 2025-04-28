<script lang="ts">
  import type { LandWithActions } from '$lib/api/land.svelte';
  import type { Token } from '$lib/interfaces';
  import { estimateNukeTime } from '$lib/utils/taxes';
  import LandNukeShield from '../land/land-nuke-shield.svelte';
  import { Label } from '../ui/label';
  import { Slider } from '../ui/slider';
  import BuyInsightsNeighborGrid from './insights/buy-insights-neighbor-grid.svelte';
  import { toNumber } from 'ethers';
  import { calculateBurnRate } from '$lib/utils/taxes';

  let {
    sellAmountVal,
    stakeAmountVal,
    selectedToken,
    land,
  }: {
    sellAmountVal: string;
    stakeAmountVal: string;
    selectedToken: Token | undefined;
    land: LandWithActions;
  } = $props();

  let nbNeighbors = $state(0);

  let taxes = $derived(calculateBurnRate(land as LandWithActions, 1)); // 1 neighbor as this is per neighbor

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

  let estimatedNukeTimeSeconds = $derived.by(() => {
    const lastPayTime =
      land.lastPayTime == 0 ? Date.now() / 1000 : toNumber(land.lastPayTime);
    return estimateNukeTime(
      parseFloat(sellAmountVal),
      parseFloat(stakeAmountVal),
      nbNeighbors,
      lastPayTime,
    );
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
  <div class="w-full flex flex-col gap-4 mr-8 text-xs">
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
            class={i + 1 == neighbors.getNeighbors().length
              ? 'text-white font-bold'
              : ''}
          >
            {i + 1}
          </span>
        {/each}
      </div>
      <Slider
        min={1}
        max={8}
        step={1}
        value={[nbNeighbors]}
        onValueChange={(val) => {
          nbNeighbors = val[0];
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
