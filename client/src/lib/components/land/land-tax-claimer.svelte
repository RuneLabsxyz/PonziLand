<script lang="ts">
  import { nukableStore, type LandWithActions } from '$lib/api/land.svelte';
  import { toBigInt } from '$lib/utils';
  import { getAggregatedTaxes, type TaxData } from '$lib/utils/taxes';

  let { land } = $props<{ land: LandWithActions }>();

  let waiting = $state(false);
  let nukableLands = $state<bigint[]>([]);

  async function handleClaimFromCoin(e: Event) {
    console.log('claiming from coin');
    waiting = true;
    await land
      .claim()
      .then(() => {
        // remove nukable lands from the nukableStore
        nukableStore.update((nukableLandsFromStore) => {
          return nukableLandsFromStore.filter((land) =>
            nukableLands.includes(land),
          );
        });
        nukableLands = [];
        setTimeout(() => {
          fetchTaxes().then(() => {
            waiting = false;
          });
        }, 5000);
      })
      .catch(() => {
        console.error('error claiming from coin');
        waiting = false;
      });
  }

  async function fetchTaxes() {
    const result = await getAggregatedTaxes(land);

    aggregatedTaxes = result.taxes;

    const nukables = result.nukable;

    nukableStore.update((nukableLandStore) => {
      const newStoreValue = [...nukableLandStore];
      // for each nukable land, add the land to the store
      for (const land of nukables) {
        const location = toBigInt(land)!;
        if (newStoreValue.includes(location)) {
          continue;
        }

        console.log('nukable land added to store', land);
        newStoreValue.push(location);
      }

      return newStoreValue;
    });
  }

  let aggregatedTaxes: TaxData[] = $state([]);

  $effect(() => {
    fetchTaxes();
  });
</script>

<div class="flex flex-col-reverse items-center animate-bounce">
  {#if aggregatedTaxes.length > 0 && !waiting}
    <button onclick={handleClaimFromCoin} class="flex items-center">
      <img
        src="/assets/ui/icons/Icon_Coin2.png"
        alt="coins"
        class="h-3 w-3 -mt-1 coin"
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

  button:hover .coin {
    filter: drop-shadow(0 0 0.1em #ffff00);
  }
</style>
