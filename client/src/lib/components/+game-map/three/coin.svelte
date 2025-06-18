<script lang="ts">
  import accountState from '$lib/account.svelte';
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
  import { Float, Instance } from '@threlte/extras';
  import type { LandTile } from './landTile';

  const dojo = useDojo();

  let {
    tile,
    i,
    instancedMesh,
    isUnzoomed = false,
  }: {
    tile: LandTile;
    i: number;
    instancedMesh: any;
    isUnzoomed: boolean;
  } = $props();

  let derivedTile = $derived(tile);

  const land = createLandWithActions(
    tile.land as BuildingLand,
    landStore.getAllLands,
  );

  let animating = $derived.by(() => {
    const claimInfo = claimStore.value[tile.land.locationString];
    if (!claimInfo) return false;

    if (claimInfo.animating) {
      setTimeout(() => {
        claimStore.value[tile.land.locationString].animating = false;
      }, 2000);
      return true;
    } else {
      return false;
    }
  });

  let timing = $derived.by(() => {
    return claimStore.value[tile.land.locationString]?.claimable ?? false;
  });

  async function handleSingleClaim() {
    if (accountState.walletAccount === undefined) {
      console.error('No wallet account found');
      return;
    }

    fetchTaxes();

    if (!land) {
      console.error("Land doesn't have a token");
      return;
    }

    claimSingleLand(land, dojo, accountState.walletAccount)
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

  // Add these handler functions to your component
  function handleCoinClick(tile: LandTile, index: number) {
    console.log('Coin clicked:', tile, index);
    handleSingleClaim();
  }

  let coinHovered = $state(false);

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

  let isOwner = $derived(
    padAddress(tile.land.owner) === padAddress(accountState.address ?? ''),
  );

  let coinPosition: [number, number, number] = $derived.by(() => {
    return [
      derivedTile.position[0] + (isUnzoomed ? 0.2 : 0),
      derivedTile.position[1] + 0.1,
      derivedTile.position[2] + (isUnzoomed ? 0 : -0.5),
    ];
  });
</script>

{#if isOwner && !animating && timing}
  <Float
    floatingRange={[
      [0, 0],
      [0, 0],
      [-0.05, 0.05],
    ]}
  >
    <Instance
      position={coinPosition}
      rotation={[-Math.PI / 2, 0, 0]}
      onclick={() => handleCoinClick(tile, i)}
      onpointerenter={() => handleCoinHover(tile, i, true)}
      onpointerleave={() => handleCoinHover(tile, i, false)}
      scale={isUnzoomed ? 1.5 : 1}
    />
  </Float>
{/if}
