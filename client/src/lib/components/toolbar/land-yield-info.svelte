<script lang="ts">
  import type { LandWithActions } from '$lib/api/land.svelte';
  import type { LandYieldInfo, YieldInfo } from '$lib/interfaces';
  import data from '$lib/data.json';
  import { padAddress, toHexWithPadding } from '$lib/utils';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';

  let { land }: { land: LandWithActions } = $props();

  const getAggregatedYield = (yieldInfos: YieldInfo[]) => {
    const aggregatedYield = yieldInfos.reduce(
      (acc, curr) => {
        const tokenAddress = toHexWithPadding(curr.token);
        acc[tokenAddress] = acc[tokenAddress] ?? 0n;
        acc[tokenAddress] += curr.sell_price;
        return acc;
      },
      {} as Record<string, bigint>,
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

  const parseNukeTime = (time: bigint) => {
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
</script>

{#await land.getYieldInfo()}
  <div class="flex justify-between">
    <div class="opacity-50">Time until nuke</div>
    <div class="text-green-500">
      <div class="animate-pulse bg-gray-800 h-3 w-12"></div>
    </div>
  </div>
{:then yieldInfo}
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
  <div class="flex justify-between">
    <p class="opacity-50">Neighb. earnings</p>
    <div class="flex flex-col">
      {#each getAggregatedYield(yieldInfo?.yield_info ?? []) as neighbourYield}
        <div class="flex justify-between gap-1 text-yellow-500">
          <div>{neighbourYield.sell_price}</div>
          <div>{neighbourYield.token?.name ?? 'unknown'}</div>
        </div>
      {/each}
    </div>
  </div>
{:catch error}
  <div class="flex justify-between">
    <p class="opacity-50">Time until nuke</p>
    <p class="text-red-500">Error fetching yield info</p>
  </div>
  <div class="flex justify-between">
    <p class="opacity-50">Neighb. earnings /day</p>
    <p class="text-red-500">Error fetching yield info</p>
  </div>
{/await}
