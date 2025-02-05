<script lang="ts">
  import type { LandWithActions } from '$lib/api/land.svelte';
  import { GAME_SPEED } from '$lib/const';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { getNeighbourYieldArray } from '$lib/utils/taxes';

  let {
    land,
  }: {
    land: LandWithActions;
  } = $props();

  let yieldInfo = $state<
    ({
      token:
        | {
            name: string;
            symbol: string;
            address: string;
            lpAddress: string;
            decimals: number;
            images: {
              icon: string;
              castle: { basic: string; advanced: string; premium: string };
            };
          }
        | undefined;
      sell_price: bigint;
      percent_rate: bigint;
      location: bigint;
      per_hour: bigint;
    } | null)[]
  >([]);

  const numberOfNeighbours = $derived(
    yieldInfo.filter((info) => (info?.percent_rate ?? 0n) !== 0n).length,
  );

  let tokenBurnRatePerNeighbor: CurrencyAmount = $derived(
    CurrencyAmount.fromRaw(
      land.sellPrice
        .rawValue()
        .multipliedBy(0.02)
        .dividedBy(8)
        .multipliedBy(GAME_SPEED),
    ),
  );

  let tokenBurnRate = $derived(
    CurrencyAmount.fromRaw(
      tokenBurnRatePerNeighbor.rawValue().multipliedBy(numberOfNeighbours),
    ),
  );

  $effect(() => {
    console.log('land from rates', land);
    if (land) {
      getNeighbourYieldArray(land).then((res) => {
        yieldInfo = res;
      });
    }
  });
</script>

<div
  class="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none"
  style="transform: translate(-33.33%, -33.33%); width: 300%; height: 300%;"
>
  {#each yieldInfo as info, i}
    {#if info?.token}
      <div
        class="overlay-square text-ponzi text-[4px] flex items-center justify-center leading-none"
      >
        <span class="whitespace-nowrap text-green-300 text-[6px]">
          +{CurrencyAmount.fromUnscaled(info.per_hour, info.token).toString()}
          {info.token?.symbol}/h
        </span>
      </div>
    {:else if i === 4}
      <div
        class="text-ponzi text-[4px] flex items-center flex-col justify-center leading-none"
      >
        <span class="whitespace-nowrap text-red-500 mb-1 text-[6px]">
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
  .overlay-square {
    border-width: 0.1px;
    border-color: #6bd5dd;
    background-color: hsla(207, 72%, 43%, 0.4);
  }
</style>
