<script lang="ts">
  import { nukableStore, type LandWithActions } from '$lib/api/land.svelte';
  import { useDojo } from '$lib/contexts/dojo';
  import { claimAllOfToken, claims } from '$lib/stores/claim.svelte';
  import { toBigInt } from '$lib/utils';
  import { getAggregatedTaxes, type TaxData } from '$lib/utils/taxes';
  import Particles from '@tsparticles/svelte';
  import { particlesConfig } from './particlesConfig';

  let onParticlesLoaded = (event: any) => {
    const particlesContainer = event.detail.particles;

    // you can use particlesContainer to call all the Container class
    // (from the core library) methods like play, pause, refresh, start, stop
  };

  const dojo = useDojo();
  const account = () => {
    return dojo.accountManager.getProvider();
  };

  let { land }: { land: LandWithActions } = $props<{ land: LandWithActions }>();

  let nukableLands = $state<bigint[]>([]);

  let animating = $derived.by(() => {
    const claimInfo = claims[land.location];
    if (!claimInfo) return false;

    if (claimInfo.animating) {
      setTimeout(() => {
        claims[land.location].animating = false;
        console.log('not animating anymore');
      }, 2000);
      return true;
    } else {
      return false;
    }
  });
  let timing = $derived(claims[land.location].claimable);

  async function handleClaimFromCoin(e: Event) {
    console.log('claiming from coin');
    fetchTaxes();

    if (!land.token) {
      console.error("Land doesn't have a token");
      return;
    }

    claimAllOfToken(land.token, dojo, account()?.getWalletAccount()!)
      .then(() => {
        // TODO remove nuke update from here
        // remove nukable lands from the nukableStore
        nukableStore.update((nukableLandsFromStore) => {
          return nukableLandsFromStore.filter(
            (nukableLand) => !nukableLands.includes(nukableLand),
          );
        });
        nukableLands = [];
      })
      .catch((e) => {
        console.error('error claiming from coin', e);
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
          continue; // TODO remove it if neighbor is not nukable and in the array
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
      fetchTaxes();
    }, 15 * 1000);

    return () => {
      clearInterval(interval);
    };
  });
</script>

<div class="relative w-full h-full">
  <div class="flex flex-col-reverse items-center animate-bounce">
    {#if aggregatedTaxes.length > 0 && timing && !animating}
      <button onclick={handleClaimFromCoin} class="flex items-center">
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
