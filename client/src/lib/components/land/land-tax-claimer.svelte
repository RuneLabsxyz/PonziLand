<script lang="ts">
  import { useLands } from '$lib/api/land.svelte';
  import {
    selectedLandMeta,
    type SelectedLandType,
  } from '$lib/stores/stores.svelte';
  import { hexStringToNumber, toHexWithPadding } from '$lib/utils';
  import data from '$lib/data.json';

  let { land } = $props<{ land: SelectedLandType }>();

  const getAggregatedTaxes = async (
    land: SelectedLandType,
  ): Promise<
    { tokenAddress: string; tokenSymbol: string; totalTax: bigint }[]
  > => {
    if (!land || !land.getNextClaim || !land.getPendingTaxes) {
      return [];
    }

    // get next claim
    const nextClaimTaxes = await land.getNextClaim();
    console.log('nextclaim taxes', nextClaimTaxes);

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
      const token = toHexWithPadding(tax.token_address);
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

  function handleClaimFromCoin() {
    console.log('claiming from coin');
  }

  function fetchTaxes() {
    getAggregatedTaxes(land).then((taxes) => {
      aggregatedTaxes = taxes;
    });
  }

  let aggregatedTaxes: {
    tokenAddress: string;
    tokenSymbol: string;
    totalTax: bigint;
  }[] = $state([]);

  $effect(() => {
    fetchTaxes();
  });
</script>

<div class="flex flex-col-reverse items-center animate-bounce">
  {#if aggregatedTaxes.length > 0}
    <button
      onclick={() => {
        handleClaimFromCoin();
      }}
      class="flex items-center"
    >
      <img
        src="/assets/tokens/basic/coin.png"
        alt="coins"
        class="h-4 w-4 -mt-1 coin"
      />
    </button>
    <div class="h-2 w-full flex flex-col items-center justify-end">
      {#each aggregatedTaxes as tax}
        <div class="text-ponzi text-nowrap text-claims pointer-events-none">
          + {tax.totalTax}
          {tax.tokenSymbol}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .text-claims {
    font-size: 4px;
  }
  .coin {
    image-rendering: pixelated;
  }
</style>
