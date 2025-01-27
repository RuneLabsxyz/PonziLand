<script lang="ts">
  import type { LandWithActions } from '$lib/api/land.svelte';
  import { MAP_SIZE } from '$lib/api/tile-store.svelte';
  import type { LandYieldInfo } from '$lib/interfaces';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import data from '$lib/data.json';
  import { toHexWithPadding } from '$lib/utils';

  let { land } = $props<{ land: LandWithActions }>();

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

          const location = land.location;
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

          // assign yield info to neighbour if location matches
          const neighborYieldInfo = neighbors.map((loc) => {
            const info = res?.yield_info.find((y) => y.location === loc);

            if (!info?.token) {
              return null;
            }

            const tokenAddress = toHexWithPadding(info?.token);
            const token = data.availableTokens.find(
              (t) => t.address == tokenAddress,
            );

            if (info) {
              return {
                ...info,
                token,
              };
            } else {
              return null;
            }
          });

          yieldInfo = neighborYieldInfo;
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
    <div class="border border-blue-400 bg-blue-400/40">
      {#if i === 4}
        <span class="whitespace-nowrap text-red-600 text-[6px]">
          -{tokenBurnRate.toString()} {land.token?.name}/h</span
        >
      {/if}
      {#if info}
        <span class="whitespace-nowrap text-green-600 text-[6px]">
          +{CurrencyAmount.fromUnscaled(info.percent_rate).toString()}
          {info.token?.name}/h
        </span>
      {/if}
    </div>
  {/each}
</div>
