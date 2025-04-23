<script lang="ts">
  import type { LandWithActions } from '$lib/api/land.svelte';
  import { GAME_SPEED } from '$lib/const';
  import type { Token } from '$lib/interfaces';
  import { Arrow } from '$lib/components/ui/arrows';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { getNeighbourYieldArray } from '$lib/utils/taxes';
  import { calculateBurnRate } from '$lib/utils/taxes';

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

  const numberOfNeighbours = $derived(
    yieldInfo.filter((info) => (info?.percent_rate ?? 0n) !== 0n).length,
  );

  let tokenBurnRate = $derived(calculateBurnRate(land, numberOfNeighbours));

  $effect(() => {
    if (land) {
      getNeighbourYieldArray(land).then((res) => {
        yieldInfo = res;
      });
    }
  });
</script>

<div
  class="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none z-20"
  style="transform: translate(-33.33%, -33.33%); width: 300%; height: 300%;"
>
  {#each yieldInfo as info, i}
    {#if info?.token}
      <div
        class="text-ponzi-number text-[3px] flex items-center justify-center leading-none"
      >
        <span class="whitespace-nowrap text-green-300">
          +{CurrencyAmount.fromUnscaled(info.per_hour, info.token).toString()}
          {info.token?.symbol}/h
        </span>
      </div>

      <!-- Straight -->
      {#if i === 1}
        <Arrow
          type="straight"
          class="w-3 h-3 top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 pr-1 absolute rotate-90"
        />
      {/if}
      {#if i === 3}
        <Arrow
          type="straight"
          class="w-3 h-3 top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 pr-1 absolute"
        />
      {/if}
      {#if i === 5}
        <Arrow
          type="straight"
          class="w-3 h-3 top-1/2 right-1/3 translate-x-1/2 -translate-y-1/2 pr-1 absolute rotate-180"
        />
      {/if}
      {#if i === 7}
        <Arrow
          type="straight"
          class="w-3 h-3 bottom-1/3 left-1/2 -translate-x-1/2 translate-y-1/2 absolute -rotate-90 pr-1"
        />
      {/if}

      <!-- Diagonals -->
      {#if i === 0}
        <Arrow
          type="bent"
          class="w-3 h-3 top-1/3 left-1/3 -translate-x-1/2 -translate-y-1/2 absolute rotate-45 pr-1"
        />
      {/if}
      {#if i === 2}
        <Arrow
          type="bent"
          class="w-3 h-3 top-1/3 right-1/3 translate-x-1/2 -translate-y-1/2 absolute rotate-[135deg] pr-1"
        />
      {/if}
      {#if i === 6}
        <Arrow
          type="bent"
          class="w-3 h-3 bottom-1/3 left-1/3 -translate-x-1/2 translate-y-1/2 absolute -rotate-45 pr-1"
        />
      {/if}
      {#if i === 8}
        <Arrow
          type="bent"
          class="w-3 h-3 bottom-1/3 right-1/3 translate-x-1/2 translate-y-1/2 absolute -rotate-[135deg] pr-1"
        />
      {/if}
    {:else if i === 4}
      <div
        class="text-ponzi-number text-[3px] flex items-center justify-center leading-none relative"
      >
        <span class="whitespace-nowrap text-red-500">
          -{tokenBurnRate.toString()} {land.token?.symbol}/h</span
        >
      </div>
    {:else}
      <div
        class="text-ponzi text-[4px] flex items-center justify-center leading-none"
      ></div>
    {/if}
  {/each}
</div>

<style>
  /* .overlay-square {
    border-width: 0.1px;
    border-color: #6bd5dd;
    background-color: hsla(207, 72%, 43%, 0.4);
  } */
</style>
