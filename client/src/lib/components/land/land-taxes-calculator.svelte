<script lang="ts">
  import { useLands, type LandWithMeta } from '$lib/api/land.svelte';
  import {
    selectedLandMeta,
    type SelectedLandType,
  } from '$lib/stores/stores.svelte';
  import { hexStringToNumber, toBigInt } from '$lib/utils';

  const landStore = useLands();

  const calculateTaxes = (sellPrice: bigint, lastClaim: number): bigint => {
    const taxRate = 4n;
    const baseTime = 3600n;

    const currentTime = new Date().getTime();

    let elapsedTime = BigInt(currentTime - lastClaim * 1000);

    console.log('Elapsed Time:', elapsedTime);
    // convert to hours
    console.log('Elapsed Time:', elapsedTime / 1000n / 60n / 60n);

    let totalTaxes = (sellPrice * taxRate * elapsedTime) / (100n * baseTime);

    return totalTaxes;
  };

  /**
   * Get all 8 neighbors of a land from the 64*64 grid with location as the center
   * @param location
   */
  const getNeighboringTaxes = async (land: SelectedLandType) => {
    if (!land) {
      return;
    }

    console.log('Pending taxes', await land.getPendingTaxes());

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

    console.log('Neighbors:', neighbors);
    // map to landsStore
    if (!$landStore) {
      return;
    }
    const neighborLands = neighbors.map((loc) =>
      $landStore.find((land) => land.location == loc),
    );
    console.log('Neighbors:', neighborLands);

    // for each of the lands calculate the claimable ammount from the last claim
    const taxes = neighborLands.map((land) => {
      if (!land || land.location == locationValue) {
        return 0;
      }
      return Number(
        calculateTaxes(toBigInt(land.sell_price), Number(land.last_pay_time)),
      ).toExponential(0);
    });

    return taxes; // insert 0 in the middle
  };

  let taxes = $derived(async () => {
    if (!$selectedLandMeta) {
      return [];
    }
    return (await getNeighboringTaxes($selectedLandMeta)) ?? [];
  });
</script>

<div class="grid z-40">
  {#await taxes() then taxes}
    {#each taxes as tax}
      <div class="grid-item text-ponzi">{tax}</div>
    {/each}
  {/await}
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
