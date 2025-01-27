<script lang="ts">
  import type { LandWithActions } from '$lib/api/land.svelte';
  import { MAP_SIZE } from '$lib/api/tile-store.svelte';
  import type { LandYieldInfo } from '$lib/interfaces';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import data from '$lib/data.json';
  import { toHexWithPadding } from '$lib/utils';

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
    } | null)[]
  >([]);
  let tokenBurnRate: CurrencyAmount = $derived(
    CurrencyAmount.fromRaw(land.sellPrice.rawValue().multipliedBy(0.02)),
  );

  $effect(() => {
    console.log('land from rates', land);
    if (land) {
      land
        .getYieldInfo()
        .then((res: LandYieldInfo | undefined) => {
          console.log('yield info response:', res);

          const location = Number(land.location);
          const neighbors = [
            location - MAP_SIZE - 1,
            location - MAP_SIZE,
            location - MAP_SIZE + 1,
            location - 1,
            location,
            location + 1,
            location + MAP_SIZE - 1,
            location + MAP_SIZE,
            location + MAP_SIZE + 1,
          ];

          console.log('neighbors:', neighbors);
          console.log(
            'neighbors bigints',
            neighbors.map((n) => BigInt(n)),
          );

          // assign yield info to neighbour if location matches
          const neighborYieldInfo = neighbors.map((loc) => {
            const info = res?.yield_info.find((y) => y.location == BigInt(loc));

            if (!info?.percent_rate) {
              return {
                ...info,
                token: undefined,
                location: BigInt(loc),
                sell_price: 0n,
                percent_rate: 0n,
              };
            }

            const tokenAddress = toHexWithPadding(info?.token);
            const token = data.availableTokens.find(
              (t) => t.address == tokenAddress,
            );

            return {
              ...info,
              token,
            };
          });

          const infosFormatted = neighborYieldInfo.sort((a, b) => {
            return Number((a?.location ?? 0n) - (b?.location ?? 0n));
          });
          console.log('yield info:', infosFormatted);

          yieldInfo = infosFormatted;
        })
        .catch((error: any) => {
          console.error('Error fetching yield info:', error);
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
        <span class="whitespace-nowrap text-green-600 text-[6px]">
          +{CurrencyAmount.fromUnscaled(info.percent_rate).toString()}
          {info.token?.symbol}/h
        </span>
      </div>
    {:else if i === 4}
      <div
        class="text-ponzi text-[4px] flex items-center justify-center leading-none"
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
