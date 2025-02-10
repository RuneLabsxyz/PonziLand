<script lang="ts">
  import { nukableStore, type LandWithActions } from '$lib/api/land.svelte';
  import { claimQueue } from '$lib/stores/event.store.svelte';
  import { getTokenInfo, toBigInt } from '$lib/utils';
  import { getAggregatedTaxes, type TaxData } from '$lib/utils/taxes';
  import { Confetti } from 'svelte-confetti';
  import Particles from '@tsparticles/svelte';
  import { particlesConfig } from './particlesConfig';

  let onParticlesLoaded = (event: any) => {
    const particlesContainer = event.detail.particles;

    // you can use particlesContainer to call all the Container class
    // (from the core library) methods like play, pause, refresh, start, stop
  };

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
    {#if aggregatedTaxes.length > 0 && !waiting}
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
      class="absolute h-[60rem] w-[60rem] top-0 left-1/2 flex items-center justify-center -translate-y-1/2 -translate-x-1/2 animate-fade-out"
    >
      <Particles
        id="tsparticles-{land.location}"
        class="animate-fade-out"
        options={particlesConfig}
        on:particlesLoaded={onParticlesLoaded}
      />
    </div>
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
    50% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      transform: translateY(-20px);
    }
  }
  .animate-fade-up {
    animation: fade-up 1.5s ease-out forwards;
  }

  @keyframes fade-out {
    0% {
      opacity: 1;
    }

    50% {
      opacity: 1;
    }

    100% {
      opacity: 0;
    }
  }

  .animate-fade-out {
    animation: fade-out 1s ease-out forwards;
  }

  .unselectable {
    -webkit-user-drag: none;
    user-select: none;
    -moz-user-select: none;
    -webkit-user-select: none;
    -ms-user-select: none;
  }
</style>
