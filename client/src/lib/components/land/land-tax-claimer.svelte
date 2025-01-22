<script lang="ts">
  import { nukableStore, type LandWithActions } from '$lib/api/land.svelte';
  import { toBigInt, toHexWithPadding } from '$lib/utils';
  import data from '$lib/data.json';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { Tag } from 'lucide-svelte';
  import { type Token } from '$lib/interfaces';
  import { getAggregatedTaxes } from '$lib/utils/taxes';

  let { land } = $props<{ land: LandWithActions }>();

  let waiting = $state(false);
  let nukableLands = $state<bigint[]>([]);

  async function handleClaimFromCoin() {
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
    aggregatedTaxes = await getAggregatedTaxes(land);

    const nukableLands = aggregatedTaxes
      .filter((tax) => tax.canBeNuked)
      .map((e) => toBigInt(e.tokenAddress)!);

    nukableStore.update((nukableLandStore) => {
      const newStoreValue = [...nukableLandStore];
      // for each nukable land, add the land to the store
      for (const land of nukableLands) {
        if (newStoreValue.includes(land)) {
          continue;
        }

        console.log('nukable land added to store', land);
        newStoreValue.push(land);
      }

      return newStoreValue;
    });
  }

  let aggregatedTaxes: {
    tokenAddress: string;
    tokenSymbol: string;
    totalTax: CurrencyAmount;
    canBeNuked: boolean;
  }[] = $state([]);

  $effect(() => {
    fetchTaxes();
  });
</script>

<div class="flex flex-col-reverse items-center animate-bounce">
  {#if aggregatedTaxes.length > 0 && !waiting}
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

  button:hover .coin {
    filter: drop-shadow(0 0 0.1em #ffff00);
  }
</style>
