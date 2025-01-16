<script lang="ts">
  import { useLands, type LandWithMeta } from '$lib/api/land.svelte';
  import {
    selectedLandMeta,
    type SelectedLandType,
  } from '$lib/stores/stores.svelte';
  import { hexStringToNumber, toBigInt } from '$lib/utils';

  let { showAggregated = false } = $props();

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

  const getNeighbourLands = (land: SelectedLandType) => {
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
      $landStore.find((land) => land.location == loc),
    );
  };

  const getNeighboringTaxes = async (land: SelectedLandType) => {
    if (!land) {
      return;
    }
    console.log('Pending taxes', await land.getPendingTaxes());

    const neighborLands = getNeighbourLands(land) ?? [];

    const locationValue = hexStringToNumber(land.location);

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

  const AggregatedTaxes = async (
    land: SelectedLandType,
  ): Promise<{ token: string; totalTax: number }[]> => {
    if (!land) {
      return [];
    }

    const neighborLands = getNeighbourLands(land) ?? [];
    const locationValue = hexStringToNumber(land.location);
    // Create a map to hold the total taxes per token
    const tokenTaxMap: Record<string, number> = {};

    // Calculate and aggregate taxes
    neighborLands.forEach((neighborLand) => {
      if (!neighborLand || neighborLand.location == locationValue) {
        return;
      }

      const taxAmount = Number(
        calculateTaxes(
          toBigInt(neighborLand.sell_price),
          Number(neighborLand.last_pay_time),
        ),
      );

      // Get the token for the land
      const token = neighborLand.tokenUsed;

      if (token) {
        // Aggregate the tax amount for the token
        tokenTaxMap[token] = (tokenTaxMap[token] || 0) + taxAmount;
      }
    });

    // TODO add the pending taxes to the total tax amount
    const pendingTaxes = await land.getPendingTaxes();
    if (pendingTaxes === undefined) {
      return [];
    }
    pendingTaxes.forEach((tax) => {
      const token = tax.token_address;
      const taxAmount = Number(tax.amount);
      tokenTaxMap[Number(token)] = (tokenTaxMap[Number(token)] || 0) + taxAmount;
    });

    // Convert the map to an array of objects
    const result = Object.entries(tokenTaxMap).map(([token, totalTax]) => ({
      token,
      totalTax,
    }));

    return result;
  };

  const newAggregatedTaxes = async (land: SelectedLandType,
  ): Promise<{ token: string; totalTax: number }[]> => {
    if (!land) {
      return [];
    }

    // get next claim


    // get pending taxes

    // aggregate

    return [];
  }


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
    return await AggregatedTaxes($selectedLandMeta);
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
            <div class="text-ponzi">{tax.token} {tax.totalTax}</div>
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
