<script lang="ts">
  import LandDisplay from '$lib/components/+game-map/land/land-display.svelte';
  import { cn } from '$lib/utils';
  import PonziProgress from './PonziProgress.svelte';
  import type { Token } from '$lib/interfaces';
  import LandOverview from '$lib/components/+game-map/land/land-overview.svelte';

  interface Props {
    pnl?: number;
    boughtAt?: number;
    boughtAtTicker?: string;
    soldAt?: number;
    tokenInflow?: number;
    tokenOutflow?: number;
    tokenTickers?: string[];
    tokenInflowAmounts?: number[];
    tokenMetadataList?: Array<{
      address: string;
      symbol: string;
      icon?: string;
    }>;
    taxes?: number;
    landTicker?: string;
    landToken?: Token;
  }

  let {
    pnl = 75.24,
    boughtAt = 10.25,
    boughtAtTicker = 'STRK',
    soldAt = 15.87,
    tokenInflow = 156.34,
    tokenOutflow = -89.12,
    tokenTickers = [
      'STRK',
      'ETH',
      'BTC',
      'SURVIVOR',
      'BROTHER',
      'USDC',
      'DREAMS',
    ],
    tokenInflowAmounts = [100.34, 56.0, 25.5, 18.75, 12.3, 8.9, 6.55],
    tokenMetadataList = [],

    landTicker = 'BROTHER',
    landToken,
  }: Props = $props();

  const formattedValue = $derived(
    `${pnl > 0 ? '+' : '-'}$${Math.abs(pnl).toFixed(2)}`,
  );
  const textSizeClass = $derived.by(() => {
    const length = formattedValue.length;
    if (length <= 8) return 'text-6xl';
    if (length <= 10) return 'text-5xl';
    if (length <= 12) return 'text-4xl';
    if (length <= 14) return 'text-3xl';
    return 'text-2xl';
  });

  const tokenPercentages = $derived.by(() => {
    const total = tokenInflowAmounts.reduce((sum, amount) => sum + amount, 0);
    return tokenInflowAmounts.map((amount) => (amount / total) * 100);
  });

  const progressValues = $derived.by(() => {
    const fallbackColorMap = [
      '#3B82F6', // blue-500
      '#8B5CF6', // purple-500
      '#10B981', // green-500
      '#EAB308', // yellow-500
      '#EF4444', // red-500
      '#F97316', // orange-500
      '#EC4899', // pink-500
    ];

    return tokenTickers.map((ticker, i) => {
      const metadata = tokenMetadataList?.find(
        (meta) => meta.symbol === ticker,
      );
      return {
        percentage: tokenPercentages[i] || 0,
        color: fallbackColorMap[i] || '#6B7280',
        ticker,
        icon: metadata?.icon,
        tokenAddress: metadata?.address,
      };
    });
  });
</script>

<div
  class={cn('w-[760px] h-[600px] relative text-white', {
    'bg-pnl-green': pnl >= 0,
    'bg-pnl-red': pnl < 0,
  })}
>
  <div class="absolute top-[120px] left-0 bottom-0 h-[600px] w-[450px] px-8">
    <div class="w-full flex items-center gap-6">
      <div>
        <LandDisplay token={landToken} class="w-32 h-32" />
      </div>
      <span
        class={cn(
          'font-ponzi-number tracking-wider stroke-3d-black',
          textSizeClass,
          {
            'text-green-400': pnl > 0,
            'text-red-400': pnl < 0,
            'text-white': pnl === 0,
          },
        )}
      >
        {formattedValue}
      </span>
    </div>
    <div class="grid grid-cols-2 gap-4 w-full text-lg m-4">
      <!-- Left Column -->
      <div class="flex flex-col gap-1">
        <div class="text-white stroke-3d-black">Bought at:</div>
        <div class="font-ponzi-number number-display-shadow tracking-wider">
          ${boughtAt.toFixed(2)}
        </div>
      </div>

      <div class="flex flex-col gap-1">
        <div class="text-white stroke-3d-black">Sold at:</div>
        {#if soldAt > 0}
          <div class="font-ponzi-number number-display-shadow tracking-wider">
            ${soldAt.toFixed(2)}
          </div>
        {:else}
          <div class="flex gap-1 items-center font-ponzi-number tracking-wider">
            <img src="/ui/icons/Icon_Nuke.png" alt="Nuked" class="h-4 w-4" />
            <span class="text-red-400 number-display-shadow">NUKED</span>
          </div>
        {/if}
      </div>

      <!-- Right Column -->
      <div class="flex flex-col gap-2">
        <div class="text-white stroke-3d-black flex items-bottom gap-1">
          <img
            src="/ui/icons/IconTiny_Outcome.png"
            alt="outcome"
            class="h-6 w-6"
          />
          <span> Taxes: </span>
        </div>
        <div
          class="font-ponzi-number number-display-shadow text-red-400 flex gap-2 items-center tracking-wider"
        >
          <span>
            {tokenOutflow > 0 ? '+' : '-'}${Math.abs(tokenOutflow).toFixed(2)}
          </span>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <div class="text-white stroke-3d-black flex items-bottom gap-1">
          <img
            src="/ui/icons/IconTiny_Income.png"
            alt="income"
            class="h-6 w-6"
          />
          <span> Income: </span>
        </div>
        <div
          class="font-ponzi-number number-display-shadow text-green-400 flex gap-2 items-center tracking-wider"
        >
          <span>
            {tokenInflow > 0 ? '+' : ''}${Math.abs(tokenInflow).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
    <!-- Full Width Progress Section -->
    <div class="mt-6 -mr-6 flex flex-col">
      <PonziProgress values={progressValues} />
      <div class="grid grid-cols-3">
        {#each progressValues as value}
          <div class="flex items-center gap-1">
            <div
              class="w-2 h-2 rounded-full"
              style="background-color: {value.color}"
            ></div>
            <span>{value.ticker}: {value.percentage.toFixed(1)}%</span>
          </div>
        {/each}
      </div>
    </div>
  </div>
  <div class="absolute left-0 bottom-0 p-4 text-xl tracking-wide">
    play.ponzi.land
  </div>
</div>

<style>
  .bg-pnl-green {
    background-image: url('/PnL/PnL-green.png');
    background-size: cover;
  }

  .bg-pnl-red {
    background-image: url('/PnL/PnL-red.png');
    background-size: cover;
  }

  .number-display-shadow {
    text-shadow: 0px 3px 0 #000;
  }
</style>
