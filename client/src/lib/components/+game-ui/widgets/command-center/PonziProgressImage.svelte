<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    values?: {
      percentage: number;
      color: string;
      ticker?: string;
      icon?: string;
      tokenAddress?: string;
    }[];
    title?: string | Snippet;
  }

  let {
    values = [
      {
        percentage: 35,
        color: '#FF00FF',
        ticker: 'STRK',
      },
      {
        percentage: 15,
        color: '#00FFFF',
        ticker: 'STRK',
      },
      {
        percentage: 25,
        color: '#0000FF',
        ticker: 'STRK',
      },
      {
        percentage: 15,
        color: '#00FF00',
      },
      {
        percentage: 10,
        color: '#FF0000',
      },
    ],
    title = 'TOKENS EARNED',
  }: Props = $props();
</script>

<div class="progress-ponzi-gray relative -ms-5">
  <div class="absolute top-0 left-0 flex">
    <span
      class="font-ponzi-number text-gray-200 text-2xl stroke-3d-black z-50 ml-[1.75em] mt-[.25em] -translate-y-full leading-none"
    >
      {#if typeof title === 'string'}
        {title}
      {:else if title}
        {@render title()}
      {/if}
    </span>
  </div>
  <div
    class="h-[63px] skew left-[30px] top-[9px] pr-[60px] overflow-hidden relative flex"
  >
    {#each values as value, index}
      <div
        class="h-full flex items-center justify-center"
        style="background-color: {value.color}; width: {value.percentage}%;"
      >
        {#if value.percentage > 10 && value.icon}
          <img
            src={value.icon}
            alt={value.ticker || 'token'}
            class="w-8 h-8"
            style="transform: skew(26deg);"
          />
        {/if}
      </div>
    {/each}
  </div>
  <div
    class="bg-white h-[4px] opacity-50 absolute skew left-[3em] top-[.65em] right-[1em]"
  ></div>
  <div
    class="bg-black h-2 opacity-25 absolute skew left-[1em] bottom-[.5em] right-[2.2em]"
  ></div>
</div>

<style global>
  .progress-ponzi-gray {
    background-clip: padding-box;
    background-image: url('PnL/progress-slanted-gray.png');
    image-rendering: pixelated;
    background-size: contain;
    aspect-ratio: auto 128 / 24;
  }
  .skew {
    transform: skew(-26deg);
  }
</style>
