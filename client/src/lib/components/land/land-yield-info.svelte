<script lang="ts">
  import type { LandWithActions } from '$lib/api/land.svelte';
  import data from '$lib/data.json';
  import type { LandYieldInfo, YieldInfo } from '$lib/interfaces';
  import { toHexWithPadding } from '$lib/utils';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';

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

  const parseNukeTime = (givenTime: bigint) => {
    const time = givenTime / 60n; // Convert seconds to minutes

    // Convert minutes (bigint) to days, hours, minutes, and seconds
    const minutes = time % 60n;
    const hours = (time / 60n) % 24n;
    const days = time / 1440n; // 1440 minutes in a day

    // Build the formatted string
    const parts: string[] = [];

    if (days > 0) parts.push(`${days} day${days > 1n ? 's' : ''}`);
    if (hours > 0n || days > 0n)
      parts.push(`${hours.toString().padStart(2, '0')}h`);
    if (minutes > 0n || hours > 0n || days > 0n)
      parts.push(`${minutes.toString().padStart(2, '0')}m`);

    return {
      minutes,
      hours,
      days,
      toString: () => parts.join(' '),
    };
  };

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
    <div class="text-red-500">{totalBurnRate} {land?.token?.symbol}/h</div>
  </div>
  <div class="flex justify-between">
    <div class="opacity-50">Time until nuke</div>
    <div
      class={parseNukeTime(yieldInfo?.remaining_stake_time ?? 0n).days <= 0n
        ? 'text-red-500'
        : 'text-green-500'}
    >
      {parseNukeTime(yieldInfo?.remaining_stake_time ?? 0n)}
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
