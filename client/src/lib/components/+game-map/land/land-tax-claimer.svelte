<script lang="ts">
  import { type LandWithActions } from '$lib/api/land';
  import { useDojo } from '$lib/contexts/dojo';
  import { gameSounds } from '$lib/stores/sfx.svelte';
  import { claimSingleLand, claimStore } from '$lib/stores/claim.store.svelte';
  import {
    clearPending,
    nukeStore,
    setPending,
  } from '$lib/stores/nuke.store.svelte';
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
    return dojo.accountManager?.getProvider();
  };

  let { land }: { land: LandWithActions } = $props<{ land: LandWithActions }>();

  let animating = $derived.by(() => {
    const claimInfo = claimStore.value[land.location];
    if (!claimInfo) return false;

    if (claimInfo.animating) {
      setTimeout(() => {
        claimStore.value[land.location].animating = false;
        console.log('not animating anymore');
      }, 2000);
      return true;
    } else {
      return false;
    }
  });
  let timing = $derived.by(() => {
    return claimStore.value[land.location]?.claimable ?? false;
  });

  async function handleSingleClaim(e: Event) {
    console.log('claiming from single land');
    fetchTaxes();

    if (!land.token) {
      console.error("Land doesn't have a token");
      return;
    }

    claimSingleLand(land, dojo, account()?.getWalletAccount()!)
      .then(() => {
        gameSounds.play('claim');
      })
      .catch((e) => {
        console.error('error claiming from coin', e);
      });
  }

  async function fetchTaxes() {
    const result = await getAggregatedTaxes(land);
    aggregatedTaxes = result.taxes;

    const nukables = result.nukables;

    nukables.forEach((land) => {
      if (land.nukable) {
        setPending(land.location);
      } else if (!land.nukable && nukeStore.pending[land.location]) {
        clearPending(land.location);
      }
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
      <button onclick={handleSingleClaim} class="flex items-center">
        <img
          src="/ui/icons/Icon_Coin2.png"
          alt="coins"
          class="h-[64px] w-[64px] -mt-8 coin unselectable"
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
      class="h-16 w-full flex flex-col items-center justify-end animate-fade-up"
    >
      {#each aggregatedTaxes as tax}
        <div
          class="text-ponzi text-2xl text-nowrap text-claims pointer-events-none"
        >
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
