<script lang="ts">
  import { BuildingLand } from '$lib/api/land/building_land';
  import { useDojo } from '$lib/contexts/dojo';
  import { claimSingleLand, claimStore } from '$lib/stores/claim.store.svelte';
  import {
    clearPending,
    nukeStore,
    setPending,
  } from '$lib/stores/nuke.store.svelte';
  import { gameSounds } from '$lib/stores/sfx.svelte';
  import { landStore } from '$lib/stores/store.svelte';
  import { padAddress } from '$lib/utils';
  import { createLandWithActions } from '$lib/utils/land-actions';
  import { getAggregatedTaxes, type TaxData } from '$lib/utils/taxes';
  import { T } from '@threlte/core';
  import { Float, Instance } from '@threlte/extras';
  import { NearestFilter, TextureLoader } from 'three';
  import type { LandTile } from './landTile';

  const dojo = useDojo();
  const account = () => {
    return dojo.accountManager?.getProvider();
  };

  let { tile, i }: { tile: LandTile; i: number } = $props();

  const land = BuildingLand.is(tile.land)
    ? createLandWithActions(tile.land, landStore.getAllLands)
    : undefined;

  let animating = $derived.by(() => {
    const claimInfo = claimStore.value[land?.location];
    if (!claimInfo) return false;

    if (claimInfo.animating) {
      setTimeout(() => {
        claimStore.value[land?.location].animating = false;
      }, 2000);
      return true;
    } else {
      return false;
    }
  });
  let timing = $derived.by(() => {
    return claimStore.value[land?.location]?.claimable ?? false;
  });

  async function handleSingleClaim() {
    fetchTaxes();

    if (!land) {
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
    if (!land || !land.location) {
      console.error('Land or location is not defined');
      return;
    }

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
    if (!isOwner) {
      return;
    }

    fetchTaxes();

    const interval = setInterval(() => {
      fetchTaxes();
    }, 15 * 1000);

    return () => {
      clearInterval(interval);
    };
  });

  // Add these handler functions to your component
  function handleCoinClick(tile: LandTile, index: number) {
    console.log('Coin clicked:', tile, index);
    handleSingleClaim();
  }

  function handleCoinHover(tile: LandTile, index: number, isHovering: boolean) {
    // Add hover effects here
    // For example: scale animation, color change, etc.
    coinHovered = isHovering;
    if (isHovering) {
      document.body.classList.add('cursor-pointer');
    } else {
      document.body.classList.remove('cursor-pointer');
    }
  }

  let texture = new TextureLoader().load('/ui/icons/Icon_Coin2.png');
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.colorSpace = 'srgb';

  let coinHovered = $state(false);
  let isOwner = $derived(
    padAddress(tile.land.owner) ===
      padAddress(account()?.getWalletAccount()?.address ?? ''),
  );
</script>

<Float
  floatingRange={[
    [0, 0],
    [0, 0],
    [-0.05, 0.05],
  ]}
>
  <!-- {#if coinHovered}
        <T.Mesh rotation={[-Math.PI / 2, 0, 0]}>
          <T.PlaneGeometry args={[0.35, 0.35]} />
          <ImageMaterial {texture} />
        </T.Mesh>
      {/if} -->
  <Instance
    onclick={() => handleCoinClick(tile, i)}
    onpointerenter={() => handleCoinHover(tile, i, true)}
    onpointerleave={() => handleCoinHover(tile, i, false)}
    rotation={[-Math.PI / 2, 0, 0]}
    position={[tile.position[0], tile.position[1] + 2, tile.position[2] - 0.5]}
  />
</Float>
