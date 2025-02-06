<script lang="ts">
  import { nukableStore, type LandWithActions } from '$lib/api/land.svelte';
  import { claimQueue } from '$lib/stores/event.store.svelte';
  import { getTokenInfo, toBigInt } from '$lib/utils';
  import { getAggregatedTaxes, type TaxData } from '$lib/utils/taxes';
  import { Confetti } from 'svelte-confetti';

  let { land } = $props<{ land: LandWithActions }>();

  let nukableLands = $state<bigint[]>([]);

  let waiting = $state(false);
  let animating = $state(false);
  let claiming = $state(false);

  async function handleClaimFromCoin() {
    console.log('claiming from coin');
    waiting = true;
    claiming = true;
    animating = true;

    setTimeout(() => {
      animating = false;
      console.log('not animating anymore');
    }, 2000);

    claimQueue.update((queue) => {
      return [
        ...queue,
        ...aggregatedTaxes.map((tax) => {
          const token = getTokenInfo(tax.tokenAddress);
          tax.totalTax.setToken(token);
          console.log('total tax when updating queue', tax.totalTax);
          return tax.totalTax;
        }),
      ];
    });
    await land
      .claim()
      .then(() => {
        claiming = false;
        // remove nukable lands from the nukableStore
        nukableStore.update((nukableLandsFromStore) => {
          return nukableLandsFromStore.filter(
            (land) => !nukableLands.includes(land),
          );
        });
        nukableLands = [];
        setTimeout(() => {
          fetchTaxes().then(() => {
            console.log('not waiting anymore');
            waiting = false;
          });
        }, 5 * 1000);
      })
      .catch(() => {
        console.error('error claiming from coin');
        waiting = false;
      });
  }

  async function fetchTaxes() {
    const result = await getAggregatedTaxes(land);

    aggregatedTaxes = result.taxes;

    const nukableLands = result.nukable;

    nukableStore.update((nukableLandStore) => {
      const newStoreValue = [...nukableLandStore];
      // for each nukable land, add the land to the store
      for (const land of nukableLands) {
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

    const interval = setInterval(() => {
      console.log('refetching taxes');
      fetchTaxes();
    }, 10 * 1000);

    return () => {
      clearInterval(interval);
    };
  });
</script>

<div class="relative w-full h-full">
  <div class="flex flex-col-reverse items-center animate-bounce">
    {#if (aggregatedTaxes.length > 0 && !waiting) || true}
      <button
        onclick={() => {
          handleClaimFromCoin();
        }}
        class="flex items-center"
      >
        <img
          src="/assets/ui/icons/Icon_Coin2.png"
          alt="coins"
          class="h-3 w-3 -mt-1 coin unselectable"
        />
      </button>
    {/if}
  </div>

  {#if animating}
    <div
      class="h-2 w-full flex flex-col items-center justify-end animate-fade-up"
    >
      {#each aggregatedTaxes as tax}
        <div class="text-ponzi text-nowrap text-claims pointer-events-none">
          + {tax.totalTax}
          {tax.tokenSymbol}
        </div>
      {/each}
    </div>
    <div
      class="absolute top-0 left-0 h-full w-full flex items-center justify-center"
    >
      <Confetti
        size={4}
        x={[-0.08, 0.08]}
        y={[0.05, 0.1]}
        delay={[0, 200]}
        duration={1300}
        amount={20}
        fallDistance="20px"
        colorArray={['url(/assets/ui/icons/Icon_Coin1.png)']}
      />
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

  @keyframes fade-up {
    0% {
      opacity: 1;
      transform: translateY(0);
    }
    100% {
      opacity: 0;
      transform: translateY(-30px);
    }
  }
  .animate-fade-up {
    animation: fade-up 1.5s ease-out forwards;
  }

  .unselectable {
    -webkit-user-drag: none;
    user-select: none;
    -moz-user-select: none;
    -webkit-user-select: none;
    -ms-user-select: none;
  }
</style>
