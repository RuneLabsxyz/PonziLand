<script lang="ts">
  import { cn } from '$lib/utils';

  interface Props {
    pnl?: number;
    boughtAt?: number;
    boughtAtTicker?: string;
    soldAt?: number;
    tokenInflow?: number;
    tokenOutflow?: number;
    tokenTickers?: string[];
    tokenInflowAmounts?: number[];
    taxes?: number;
    landTicker?: string;
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

    landTicker = 'BROTHER',
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
</script>

<div
  class={cn('w-[760px] h-[600px] relative text-white', {
    'bg-pnl-green': pnl >= 0,
    'bg-pnl-red': pnl < 0,
  })}
>
  <div class="absolute top-[120px] left-0 bottom-0 h-[600px] w-[450px] p-8">
    <div class="w-full flex items-center justify-center">
      <span
        class={cn(
          'font-ponzi-number tracking-wider stroke-3d-black',
          textSizeClass,
          {
            'text-green-500': pnl > 0,
            'text-red-500': pnl < 0,
            'text-white': pnl === 0,
          },
        )}
      >
        {formattedValue}
      </span>
    </div>
    <div class="flex flex-col gap-1 w-full text-sm">
      <div>Bought at:</div>
      <div>${boughtAt.toFixed(2)} {boughtAtTicker}</div>

      <div>Sold at:</div>
      <div>${soldAt.toFixed(2)} {landTicker}</div>

      <div>Token outflow:</div>
      <div>
        {tokenOutflow > 0 ? '+' : ''}${Math.abs(tokenOutflow).toFixed(2)}
      </div>
      <div>Token inflow:</div>
      <div class="space-y-1">
        <div>
          {tokenInflow > 0 ? '+' : ''}${Math.abs(tokenInflow).toFixed(2)}
        </div>
        <div class="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
          <div class="h-full flex">
            {#each tokenPercentages as percentage, i}
              <div
                class={cn('h-full', {
                  'bg-blue-500': i === 0,
                  'bg-purple-500': i === 1,
                  'bg-green-500': i === 2,
                  'bg-yellow-500': i === 3,
                  'bg-red-500': i === 4,
                  'bg-orange-500': i === 5,
                  'bg-pink-500': i === 6,
                })}
                style="width: {percentage}%"
              ></div>
            {/each}
          </div>
        </div>
        <div class="flex gap-2 text-xs">
          {#each tokenTickers as ticker, i}
            <div class="flex items-center gap-1">
              <div
                class={cn('w-2 h-2 rounded-full', {
                  'bg-blue-500': i === 0,
                  'bg-purple-500': i === 1,
                  'bg-green-500': i === 2,
                  'bg-yellow-500': i === 3,
                  'bg-red-500': i === 4,
                  'bg-orange-500': i === 5,
                  'bg-pink-500': i === 6,
                })}
              ></div>
              <span>{ticker}: {tokenPercentages[i].toFixed(1)}%</span>
            </div>
          {/each}
        </div>
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
</style>
