<script lang="ts">
  import type { LandWithActions } from '$lib/api/land.svelte';
  import { landStore } from '$lib/api/mock-land';
  import type { Token } from '$lib/interfaces';
  import { estimateNukeTime, estimateTax } from '$lib/utils/taxes';
  import LandNukeShield from '../land/land-nuke-shield.svelte';
  import { Label } from '../ui/label';
  import { Slider } from '../ui/slider';

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

  let taxes = $derived(estimateTax(parseInt(sellAmountVal)));

  let neighbors = $derived(land?.getNeighbors());
  let nbNeighbors = $state(neighbors.array.length);

  let estimatedNukeTimeSeconds = $derived(
    estimateNukeTime(
      parseInt(sellAmountVal),
      parseInt(stakeAmountVal),
      nbNeighbors,
    ),
  );

  let estimatedTimeString = $derived.by(() => {
    const time = estimatedNukeTimeSeconds;
    // format seconds to dd hh mm ss
    const days = Math.floor(time / (3600 * 24));
    const hours = Math.floor((time % (3600 * 24)) / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);

    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  });

  let estimatedNukeDate = $derived.by(() => {
    const time = estimatedNukeTimeSeconds;
    const date = new Date();
    date.setSeconds(date.getSeconds() + time);
    return date.toLocaleString();
  });
</script>

<div class="flex w-full justify-between mt-4 gap-4">
  <div class="w-full p-4 flex items-center justify-center">
    <div class="grid grid-cols-3 gap-2 w-fit">
      <div class="w-8 h-8 bg-gray-400"></div>
      <div class="w-8 h-8 bg-gray-400"></div>
      <div class="w-8 h-8 bg-gray-400"></div>

      <div class="w-8 h-8 bg-gray-400">{neighbors.left}</div>

      <!--Own Land-->
      <div class="w-8 h-8 bg-gray-400">
        {selectedToken?.symbol ?? 'choose token'}
      </div>

      <div class="w-8 h-8 bg-gray-400">{neighbors.right}</div>

      <div class="w-8 h-8 bg-gray-400"></div>
      <div class="w-8 h-8 bg-gray-400"></div>
      <div class="w-8 h-8 bg-gray-400"></div>
    </div>
  </div>
  <div class="w-full flex flex-col gap-4 mr-8">
    <div class="flex flex-col gap-4">
      <Label class="font-bold">Neighbours</Label>
      <div class="flex justify-between text-gray-400">
        {#each Array(8) as _, i}
          <span>
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
