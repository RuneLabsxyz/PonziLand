<script lang="ts">
  import type { LandWithActions } from '$lib/api/land.svelte';
  import { GAME_SPEED } from '$lib/const';
  import type { Token } from '$lib/interfaces';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { getNeighbourYieldArray } from '$lib/utils/taxes';

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

      {#if i === 1}
        <svg
          width="171"
          height="91"
          viewBox="0 0 171 91"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          class="w-3 h-3 top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 pr-1 absolute rotate-90"
        >
          <path
            opacity="0.53"
            d="M108 66.7333C109.657 66.7333 111 68.0765 111 69.7333L111 87C111 89.2091 112.791 91 115 91L124.6 91C125.657 91 126.671 90.5816 127.42 89.8362L169.148 48.3362C170.721 46.7723 170.721 44.2277 169.148 42.6638L127.42 1.16383C126.671 0.418421 125.657 -1.49844e-06 124.6 -1.48583e-06L115 -1.37136e-06C112.791 -1.34502e-06 111 1.79086 111 4L111 21.2667C111 22.9235 109.657 24.2667 108 24.2667L3 24.2667C1.34314 24.2667 3.16897e-07 25.6098 3.50845e-07 27.2667L1.09803e-06 63.7333C1.13198e-06 65.3902 1.34315 66.7333 3 66.7333L108 66.7333Z"
            fill="url(#paint0_linear_1316_8599)"
          />
          <defs>
            <linearGradient
              id="paint0_linear_1316_8599"
              x1="5.42582e-07"
              y1="45.5"
              x2="172"
              y2="45.5"
              gradientUnits="userSpaceOnUse"
            >
              <stop stop-color="#5A843B" stop-opacity="0" />
              <stop offset="0.185" stop-color="#7DB751" stop-opacity="0" />
              <stop offset="1" stop-color="#A0EA68" />
            </linearGradient>
          </defs>
        </svg>
      {/if}
      {#if i === 3}
        <svg
          width="171"
          height="91"
          viewBox="0 0 171 91"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          class="w-3 h-3 top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 pr-1 absolute"
        >
          <path
            opacity="0.53"
            d="M108 66.7333C109.657 66.7333 111 68.0765 111 69.7333L111 87C111 89.2091 112.791 91 115 91L124.6 91C125.657 91 126.671 90.5816 127.42 89.8362L169.148 48.3362C170.721 46.7723 170.721 44.2277 169.148 42.6638L127.42 1.16383C126.671 0.418421 125.657 -1.49844e-06 124.6 -1.48583e-06L115 -1.37136e-06C112.791 -1.34502e-06 111 1.79086 111 4L111 21.2667C111 22.9235 109.657 24.2667 108 24.2667L3 24.2667C1.34314 24.2667 3.16897e-07 25.6098 3.50845e-07 27.2667L1.09803e-06 63.7333C1.13198e-06 65.3902 1.34315 66.7333 3 66.7333L108 66.7333Z"
            fill="url(#paint0_linear_1316_8599)"
          />
          <defs>
            <linearGradient
              id="paint0_linear_1316_8599"
              x1="5.42582e-07"
              y1="45.5"
              x2="172"
              y2="45.5"
              gradientUnits="userSpaceOnUse"
            >
              <stop stop-color="#5A843B" stop-opacity="0" />
              <stop offset="0.185" stop-color="#7DB751" stop-opacity="0" />
              <stop offset="1" stop-color="#A0EA68" />
            </linearGradient>
          </defs>
        </svg>
      {/if}
      {#if i === 5}
        <svg
          width="171"
          height="91"
          viewBox="0 0 171 91"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          class="w-3 h-3 top-1/2 right-1/3 translate-x-1/2 -translate-y-1/2 pr-1 absolute rotate-180"
        >
          <path
            opacity="0.53"
            d="M108 66.7333C109.657 66.7333 111 68.0765 111 69.7333L111 87C111 89.2091 112.791 91 115 91L124.6 91C125.657 91 126.671 90.5816 127.42 89.8362L169.148 48.3362C170.721 46.7723 170.721 44.2277 169.148 42.6638L127.42 1.16383C126.671 0.418421 125.657 -1.49844e-06 124.6 -1.48583e-06L115 -1.37136e-06C112.791 -1.34502e-06 111 1.79086 111 4L111 21.2667C111 22.9235 109.657 24.2667 108 24.2667L3 24.2667C1.34314 24.2667 3.16897e-07 25.6098 3.50845e-07 27.2667L1.09803e-06 63.7333C1.13198e-06 65.3902 1.34315 66.7333 3 66.7333L108 66.7333Z"
            fill="url(#paint0_linear_1316_8599)"
          />
          <defs>
            <linearGradient
              id="paint0_linear_1316_8599"
              x1="5.42582e-07"
              y1="45.5"
              x2="172"
              y2="45.5"
              gradientUnits="userSpaceOnUse"
            >
              <stop stop-color="#5A843B" stop-opacity="0" />
              <stop offset="0.185" stop-color="#7DB751" stop-opacity="0" />
              <stop offset="1" stop-color="#A0EA68" />
            </linearGradient>
          </defs>
        </svg>
      {/if}
      {#if i === 7}
        <svg
          width="171"
          height="91"
          viewBox="0 0 171 91"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          class="w-3 h-3 bottom-1/3 left-1/2 -translate-x-1/2 translate-y-1/2 absolute -rotate-90 pr-1"
        >
          <path
            opacity="0.53"
            d="M108 66.7333C109.657 66.7333 111 68.0765 111 69.7333L111 87C111 89.2091 112.791 91 115 91L124.6 91C125.657 91 126.671 90.5816 127.42 89.8362L169.148 48.3362C170.721 46.7723 170.721 44.2277 169.148 42.6638L127.42 1.16383C126.671 0.418421 125.657 -1.49844e-06 124.6 -1.48583e-06L115 -1.37136e-06C112.791 -1.34502e-06 111 1.79086 111 4L111 21.2667C111 22.9235 109.657 24.2667 108 24.2667L3 24.2667C1.34314 24.2667 3.16897e-07 25.6098 3.50845e-07 27.2667L1.09803e-06 63.7333C1.13198e-06 65.3902 1.34315 66.7333 3 66.7333L108 66.7333Z"
            fill="url(#paint0_linear_1316_8599)"
          />
          <defs>
            <linearGradient
              id="paint0_linear_1316_8599"
              x1="5.42582e-07"
              y1="45.5"
              x2="172"
              y2="45.5"
              gradientUnits="userSpaceOnUse"
            >
              <stop stop-color="#5A843B" stop-opacity="0" />
              <stop offset="0.185" stop-color="#7DB751" stop-opacity="0" />
              <stop offset="1" stop-color="#A0EA68" />
            </linearGradient>
          </defs>
        </svg>
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
