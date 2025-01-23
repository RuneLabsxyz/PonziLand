<script lang="ts">
  import { useLands, type LandWithActions } from '$lib/api/land.svelte';
  import { selectedLandMeta } from '$lib/stores/stores.svelte';
  import { hexStringToNumber } from '$lib/utils';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { getAggregatedTaxes } from '$lib/utils/taxes';

  let { showAggregated = false } = $props();

  const landStore = useLands();

  const calculateTaxes = (
    sellPrice: bigint,
    lastClaim: number,
  ): CurrencyAmount => {
    const taxRate = 4n;
    const baseTime = 3600n;

    const currentTime = new Date().getTime();

    let elapsedTime = BigInt(currentTime - lastClaim * 1000);

    console.log('Elapsed Time:', elapsedTime);
    // convert to hours
    console.log('Elapsed Time:', elapsedTime / 1000n / 60n / 60n);

    let totalTaxes = (sellPrice * taxRate * elapsedTime) / (100n * baseTime);

    return CurrencyAmount.fromUnscaled(totalTaxes);
  };

  const getNeighbourLands = (land: LandWithActions) => {
    if (!land || !$landStore) {
      return;
    }

    const MAP_SIZE = 64;
    const locationValue = hexStringToNumber(land.location);

    const neighbors = [
      locationValue - MAP_SIZE - 1,
      locationValue - MAP_SIZE,
      locationValue - MAP_SIZE + 1,
      locationValue - 1,
      locationValue,
      locationValue + 1,
      locationValue + MAP_SIZE - 1,
      locationValue + MAP_SIZE,
      locationValue + MAP_SIZE + 1,
    ];

    return neighbors.map((loc) =>
      $landStore.find((land) => locationValue == loc),
    );
  };

  const getNeighboringTaxes = async (land: LandWithActions) => {
    if (!land) {
      return;
    }
    console.log('Pending taxes', await land.getPendingTaxes());

    const neighborLands = getNeighbourLands(land) ?? [];

    const locationValue = hexStringToNumber(land.location);

    // for each of the lands calculate the claimable ammount from the last claim
    const taxes = neighborLands.map((neighbor) => {
      if (!neighbor || hexStringToNumber(neighbor.location) == locationValue) {
        return CurrencyAmount.fromUnscaled(0n);
      }
      return calculateTaxes(
        neighbor.sellPrice.toBigint(),
        Number(neighbor.last_pay_time),
      )
        .rawValue()
        .toExponential(0);
    });

    return taxes; // insert 0 in the middle
  };

  let taxes = $derived(async () => {
    if (!$selectedLandMeta) {
      return [];
    }
    return (await getNeighboringTaxes($selectedLandMeta)) ?? [];
  });

  let aggregatedTaxes = $derived(async () => {
    if (!$selectedLandMeta) {
      return [];
    }
    return (await getAggregatedTaxes($selectedLandMeta)).taxes ?? [];
  });
</script>

<div class="flex">
  <div class="grid z-40">
    {#await taxes() then taxes}
      {#each taxes as tax}
        <div class="grid-item text-ponzi">{tax}</div>
      {/each}
    {/await}
  </div>
  {#if showAggregated}
    <div>
      Aggregated:

      <div class="">
        {#await aggregatedTaxes() then taxes}
          {#each taxes as tax}
            <div class="text-ponzi">{tax.tokenSymbol}: {tax.totalTax}</div>
          {/each}
        {/await}
      </div>
    </div>
  {/if}
</div>

<style>
  .grid {
    pointer-events: none;
    height: 96px;
    width: 96px;
    display: grid;
    grid-template-columns: repeat(3, 1fr); /* 3 columns */
  }

  .grid-item {
    pointer-events: none;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
  }
</style>
