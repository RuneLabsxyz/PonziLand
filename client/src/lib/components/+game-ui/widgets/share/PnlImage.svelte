<script lang="ts">
  import LandDisplay from '$lib/components/+game-map/land/land-display.svelte';
  import type { Token } from '$lib/interfaces';
  import { getTokenMetadata } from '$lib/utils';
  import PonziProgressImage from './PonziProgressImage.svelte';

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
      originalAmount?: string;
      token?: any;
    }>;
    taxes?: number;
    landTicker?: string;
    landToken?: Token;
    status?: 'alive' | 'nuked' | 'bought';
    elementRef?: HTMLElement;
  }

  let {
    pnl = 75.24,
    boughtAt = 10.25,
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
    landToken,
    status = 'bought',
    elementRef = $bindable(),
  }: Props = $props();

  const formattedValue = $derived(
    `${pnl > 0 ? '+' : '-'}$${Math.abs(pnl).toFixed(2)}`,
  );

  const tokenPercentages = $derived.by(() => {
    const total = tokenInflowAmounts.reduce((sum, amount) => sum + amount, 0);
    return tokenInflowAmounts.map((amount) => (amount / total) * 100);
  });

  const progressValues = $derived.by(() => {
    return tokenTickers.map((ticker, i) => {
      const metadata = tokenMetadataList?.find(
        (meta) => meta.symbol === ticker,
      );
      // Get color from token skin metadata, fallback to predefined colors
      let color = '#6B7280';
      if (metadata?.token?.skin) {
        const tokenSkinMetadata = getTokenMetadata(metadata.token.skin);
        if (tokenSkinMetadata?.color) {
          color = tokenSkinMetadata.color;
        }
      }
      return {
        percentage: tokenPercentages[i] || 0,
        amount: tokenInflowAmounts[i] || 0,
        originalAmount: metadata?.originalAmount || 0,
        token: metadata?.token,
        color,
        ticker,
        icon: metadata?.icon,
        tokenAddress: metadata?.address,
      };
    });
  });
</script>

<div
  bind:this={elementRef}
  style="display: none;"
  class={[
    'w-[760px] h-[600px] text-white relative',
    {
      'bg-pnl-green': pnl >= 0,
      'bg-pnl-red': pnl < 0,
    },
  ]}
>
  <div
    class="opacity-90 absolute right-0 top-0 px-6 py-5 tracking-wider font-ponzi-number"
  >
    play.ponzi.land
  </div>
  <div class="absolute top-[120px] left-0 bottom-0 h-[480px] w-[450px] p-8">
    <div class="w-full flex items-center gap-6">
      <div class="opacity-0 w-0">
        <LandDisplay token={landToken} class="w-32 h-32" />
      </div>
      <div class="flex flex-col gap-4">
        <div
          class="flex gap-1 items-center font-ponzi-number text-xs tracking-wider"
        >
          {#if status === 'alive'}
            <div
              class="bg-green-800/50 flex items-center gap-2 px-2 py-1 rounded"
            >
              <img
                src="/ui/icons/IconTiny_Stats.png"
                alt="Closed"
                class="h-4 w-4"
              />
              <span class="text-green-300 font-semibold pt-[1px]">ALIVE</span>
            </div>
          {/if}
          {#if status === 'nuked'}
            <div
              class="bg-red-800/50 flex items-center gap-2 px-2 py-1 rounded"
            >
              <img src="/ui/icons/Icon_Nuke.png" alt="Closed" class="h-4 w-4" />
              <span class="text-red-400"> NUKED </span>
            </div>
          {/if}
          {#if status === 'bought'}
            <div
              class="bg-orange-800/50 flex items-center gap-2 px-2 py-1 rounded"
            >
              <img
                src="/ui/icons/Icon_Coin3.png"
                alt="Closed"
                class="h-4 w-4"
              />
              <span class="text-orange-300"> SOLD </span>
            </div>
          {/if}
        </div>
        <span
          class={[
            'font-ponzi-number tracking-wider stroke-3d-black',
            {
              'text-6xl': formattedValue.length <= 8,
              'text-5xl':
                formattedValue.length > 8 && formattedValue.length <= 10,
              'text-4xl':
                formattedValue.length > 10 && formattedValue.length <= 12,
              'text-3xl':
                formattedValue.length > 12 && formattedValue.length <= 14,
              'text-2xl': formattedValue.length > 14,
              'text-green-400': pnl > 0,
              'text-red-400': pnl < 0,
              'text-white': pnl === 0,
            },
          ]}
        >
          {formattedValue}
        </span>
      </div>
    </div>
    <div class="grid grid-cols-3 gap-4 w-full text-lg m-4">
      <!-- Left Column -->
      <div class="flex flex-col gap-1">
        <div class="text-white stroke-3d-black">Bought at:</div>
        <div class="font-ponzi-number number-display-shadow tracking-wider">
          ${boughtAt.toFixed(2)}
        </div>
      </div>

      {#if soldAt > 0}
        <div class="flex flex-col gap-1">
          <div class="text-white stroke-3d-black">Sold at:</div>
          <div class="font-ponzi-number number-display-shadow tracking-wider">
            ${soldAt.toFixed(2)}
          </div>
        </div>
      {/if}

      <!-- Right Column -->
      <div class="flex flex-col gap-1">
        <div class="text-white stroke-3d-black flex items-end gap-1">
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
    </div>
    <!-- Full Width Progress Section -->
    {#snippet title()}
      <div class="flex gap-2 items-center">
        <span>TOKENS EARNED</span>
        <span class="text-green-400 text-lg">+${tokenInflow.toFixed(2)}</span>
      </div>
    {/snippet}
    <div class="mt-16 -mr-6 flex flex-col">
      <PonziProgressImage values={progressValues} {title} />
      <div
        class={[
          'grid',
          {
            'grid-cols-2': progressValues.length <= 2,
            'grid-cols-3':
              progressValues.length > 2 && progressValues.length <= 6,
            'grid-cols-4': progressValues.length > 6,
          },
        ]}
      >
        {#each progressValues as value}
          <div class="flex items-center gap-1">
            <div class="w-2 h-2" style="background-color: {value.color}"></div>
            <span>{value.ticker}: {value.originalAmount}</span>
          </div>
        {/each}
      </div>
    </div>
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
  .skew {
    transform: skew(-26deg);
  }
</style>
