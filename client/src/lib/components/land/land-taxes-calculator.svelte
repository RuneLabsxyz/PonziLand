<script lang="ts">
  import { useLands, type LandWithMeta } from '$lib/api/land.svelte';
  import {
    selectedLandMeta,
    type SelectedLandType,
  } from '$lib/stores/stores.svelte';
  import { hexStringToNumber, toBigInt, toHexWithPadding } from '$lib/utils';
  import data from '$lib/data.json';

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

  const getAggregatedTaxes = async (
    land: SelectedLandType,
  ): Promise<
    { tokenAddress: string; tokenSymbol: string; totalTax: bigint }[]
  > => {
    if (!land) {
      return [];
    }

    // get next claim
    const nextClaimTaxes = await land.getNextClaim();

    // get pending taxes
    const pendingTaxes = await land.getPendingTaxes();

    // aggregate the two arrays with total tax per token
    const tokenTaxMap: Record<string, bigint> = {};

    nextClaimTaxes?.forEach((tax) => {
      const token = toHexWithPadding(tax.token_address);
      const taxAmount = tax.amount;
      tokenTaxMap[token] = (tokenTaxMap[token] || 0n) + taxAmount;
    });

    pendingTaxes?.forEach((tax) => {
      console.log('token:', tax.token_address, 'amount:', tax.amount);
      const token = toHexWithPadding(tax.token_address);
      console.log('token:', token);
      const taxAmount = tax.amount;
      tokenTaxMap[token] = (tokenTaxMap[token] || 0n) + taxAmount;
    });

    // Convert the map to an array of objects
    const result = Object.entries(tokenTaxMap).map(([token, totalTax]) => {
      console.log('Token:', token, 'Total Tax:', totalTax);
      const tokenSymbol =
        data.availableTokens.find((t) => t.address == token)?.name ?? 'Unknown';

      return {
        tokenAddress: token,
        tokenSymbol,
        totalTax,
      };
    });

    return result;
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
    return await getAggregatedTaxes($selectedLandMeta);
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
