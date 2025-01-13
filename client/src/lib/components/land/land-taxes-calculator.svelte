<script lang="ts">
  import { useLands } from '$lib/api/land.svelte';
  import { selectedLandMeta } from '$lib/stores/stores.svelte';
  import { hexStringToNumber, toBigInt } from '$lib/utils';
  import { get } from 'svelte/store';

  const landStore = useLands();

  const calculateTaxes = (sellPrice: bigint, lastClaim: number): bigint => {
    // 1% of sell price per hour
    const taxRate = 600n;
    const now = new Date();
    console.log('Now:', now);
    console.log('Last claim:', lastClaim);

    // Calculate hours as an integer
    const secondsSinceLastClaim = Math.floor(
      (now.getTime() - lastClaim * 1000) / 1000,
    );

    console.log('Hours since last claim:', secondsSinceLastClaim / 60 / 60);

    // Ensure the hours are converted to `BigInt`
    const taxes = (sellPrice * BigInt(secondsSinceLastClaim)) / taxRate;
    return taxes;
  };

  /**
   * Get all 8 neighbors of a land from the 64*64 grid with location as the center
   * @param location
   */
  const getNeighboringTaxes = (location: string) => {
    const MAP_SIZE = 64;
    const locationValue = hexStringToNumber(location);
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
      return calculateTaxes(
        toBigInt(land.sell_price),
        Number(land.last_pay_time),
      );
    });

    return taxes; // insert 0 in the middle
  };

  let taxes = $derived(
    getNeighboringTaxes($selectedLandMeta?.location ?? '') ?? [],
  );
</script>

<div class="grid z-40">
  {#each taxes as tax}
    <div class="grid-item">{tax}</div>
  {/each}
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
