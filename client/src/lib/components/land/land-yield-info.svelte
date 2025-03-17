<script lang="ts">
  import type { LandWithActions } from '$lib/api/land.svelte';
  import data from '$lib/data.json';
  import type { LandYieldInfo, YieldInfo } from '$lib/interfaces';
  import { toHexWithPadding } from '$lib/utils';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { estimateNukeTime } from '$lib/utils/taxes';
  import BigNumber from 'bignumber.js';

  const GAME_SPEED = 4;

  let {
    land,
    expanded = $bindable(false),
  }: { land: LandWithActions; expanded?: boolean } = $props();

  let landBurnPerNeighbour = $derived.by(() => {
    const taxRate = land.sellPrice
      .rawValue()
      .multipliedBy(0.02)
      .multipliedBy(GAME_SPEED);

    const taxPerNeighbour = taxRate.dividedBy(8);
    console.log('taxPerNeighbour', taxPerNeighbour.toString());

    return taxPerNeighbour;
  });

  let totalBurnRate = $derived.by(() => {
    return landBurnPerNeighbour.multipliedBy(neighbourNumber);
  });

  let estimatedNukeTime = $derived.by(() => {
    return estimateNukeTime(
      land.sellPrice.rawValue().toNumber(),
      land.stakeAmount.rawValue().toNumber(),
      land.getNeighbors().getNeighbors().length,
      Number(land.last_pay_time),
    );
  });

  const getAggregatedYield = (yieldInfos: YieldInfo[]) => {
    const aggregatedYield = yieldInfos.reduce(
      (acc, curr) => {
        const tokenAddress = toHexWithPadding(curr.token);
        acc[tokenAddress] = acc[tokenAddress] ?? 0;

        const percentRate = Number(curr.percent_rate) / 100;
        const tax = percentRate * Number(curr.sell_price);
        acc[tokenAddress] += tax;

        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(aggregatedYield).map(([token, sell_price]) => {
      // get token
      const tokenData = data.availableTokens.find((t) => t.address == token);

      return {
        token: tokenData,
        sell_price: CurrencyAmount.fromUnscaled(sell_price, tokenData),
      };
    });
  };

  const parseNukeTime = (givenTime: number) => {
    const time = givenTime / 60; // Convert seconds to minutes

    // Convert minutes (bigint) to days, hours, minutes, and seconds
    const minutes = Math.floor(time % 60);
    const hours = Math.floor((time / 60) % 24);
    const days = Math.floor(time / 1440); // 1440 minutes in a day

    // Build the formatted string
    const parts: string[] = [];

    if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
    if (hours > 0 || days > 0)
      parts.push(`${hours.toString().padStart(2, '0')}h`);
    if (minutes > 0 || hours > 0 || days > 0)
      parts.push(`${minutes.toString().padStart(2, '0')}m`);

    return {
      minutes,
      hours,
      days,
      toString: () => parts.join(' '),
    };
  };

  let parsedNukeTime = $derived(parseNukeTime(estimatedNukeTime));

  let neighbourNumber = $derived.by(() => {
    const neighbourNumber =
      yieldInfo?.yield_info.filter((y) => y.percent_rate).length ?? 0;
    console.log('neighbourNumber', neighbourNumber);
    return neighbourNumber;
  });

  let yieldInfo: LandYieldInfo | undefined = $state(undefined);

  $effect(() => {
    land.getYieldInfo().then((info) => {
      yieldInfo = info;
    });
  });
</script>

{#if !yieldInfo}
  <div class="flex justify-between">
    <div class="opacity-50">Maintenance Cost</div>
    <div class="">
      <div class="animate-pulse bg-gray-800 h-3 w-12"></div>
    </div>
  </div>
  <div class="flex justify-between">
    <div class="opacity-50">Time until nuke</div>
    <div class="text-green-500">
      <div class="animate-pulse bg-gray-800 h-3 w-12"></div>
    </div>
  </div>
{:else}
  <div class="flex justify-between">
    <div class="opacity-50">Maintenance Cost</div>
    <div class="text-red-500 text-right">
      {totalBurnRate}
      {land?.token?.symbol}/h
    </div>
  </div>
  <div class="flex justify-between">
    <div class="opacity-50">Time until nuke</div>
    <div
      class="text-right {parsedNukeTime.days <= 0n
        ? 'text-red-500'
        : 'text-green-500'}"
    >
      {parsedNukeTime}
    </div>
  </div>
  {#if expanded}
    <div class="flex justify-between">
      <p class="opacity-50">Neighb. earnings/h</p>
      <div class="flex flex-col">
        {#each getAggregatedYield(yieldInfo?.yield_info ?? []) as neighbourYield}
          <div class="flex justify-between gap-1 text-yellow-500">
            <div>{neighbourYield.sell_price}</div>
            <div>{neighbourYield.token?.symbol ?? 'unknown'}</div>
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <div class="flex justify-between">
      <p class="opacity-50">Neighb. earnings/h</p>
      <button
        type="button"
        class="px-2 bg-white bg-opacity-50"
        onclick={() => {
          expanded = true;
        }}
      >
        ...
      </button>
    </div>
  {/if}
{/if}
