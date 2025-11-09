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
    tokenTickers = ['STRK', 'ETH'],
    taxes = 12.45,
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
</script>

<div
  class={cn('w-[760px] h-[600px] relative text-white', {
    'bg-pnl-green': pnl >= 0,
    'bg-pnl-red': pnl < 0,
  })}
>
  <div class="absolute top-[120px] left-0 bottom-0 h-[600px] w-[450px]">
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
    <div class="w-full grid grid-cols-2 gap-y-1 text-sm">
      <div>Bought at:</div>
      <div>${boughtAt.toFixed(2)} {boughtAtTicker}</div>

      <div>Sold at:</div>
      <div>${soldAt.toFixed(2)} {landTicker}</div>

      <div>Token inflow:</div>
      <div>{tokenInflow > 0 ? '+' : ''}${Math.abs(tokenInflow).toFixed(2)}</div>

      <div>Token outflow:</div>
      <div>{tokenOutflow > 0 ? '+' : ''}${Math.abs(tokenOutflow).toFixed(2)}</div>

      <div>Taxes paid:</div>
      <div>${taxes.toFixed(2)} {landTicker}</div>
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
