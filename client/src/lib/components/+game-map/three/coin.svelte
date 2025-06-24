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
  import { createLandWithActions } from '$lib/utils/land-actions';
  import { getAggregatedTaxes, type TaxData } from '$lib/utils/taxes';
  import { T } from '@threlte/core';
  import { Float, ImageMaterial } from '@threlte/extras';
  import { NearestFilter, TextureLoader } from 'three';
  import type { LandTile } from './landTile';
  import { padAddress } from '$lib/utils';

  const dojo = useDojo();
  const account = () => {
    return dojo.accountManager?.getProvider();
  };

  let { tile, i }: { tile: LandTile; i: number } = $props();

  const land = tile.land; // TODO CREATE LAND WITH ACTIONS

  let animating = $derived.by(() => {
    const claimInfo = claimStore.value[land.locationString];
    if (!claimInfo) return false;

    if (claimInfo.animating) {
      setTimeout(() => {
        claimStore.value[land.locationString].animating = false;
      }, 2000);
      return true;
    } else {
      return false;
    }
  });
  let timing = $derived.by(() => {
    return claimStore.value[land.locationString]?.claimable ?? false;
  });

  async function handleSingleClaim(e: Event) {
    fetchTaxes();

    if (!land.token) {
      console.error("Land doesn't have a token");
      return;
    }

    if (!BuildingLand.is(land)) {
      console.error('Land is not a BuildingLand');
      return;
    }

    claimSingleLand(
      createLandWithActions(land, landStore.getAllLands),
      dojo,
      account()?.getWalletAccount()!,
    )
      .then(() => {
        gameSounds.play('claim');
      })
      .catch((e) => {
        console.error('error claiming from coin', e);
      });
  }

  async function fetchTaxes() {
    if (!BuildingLand.is(land)) {
      console.error('Land is not a BuildingLand');
      return;
    }

    const LandWithActions = createLandWithActions(land, landStore.getAllLands);

    const result = await getAggregatedTaxes(LandWithActions);
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

  // Add these handler functions to your component
  function handleCoinClick(tile: LandTile, index: number) {
    console.log('Coin clicked:', tile, index);
    // Add your click logic here
    // For example: collect coin, play sound, update score, etc.
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

{#if aggregatedTaxes.length > 0 && timing && !animating && isOwner}
  <T.Group
    position={[tile.position[0], tile.position[1] + 2, tile.position[2] - 0.5]}
    onclick={() => handleCoinClick(tile, i)}
    onpointerenter={() => handleCoinHover(tile, i, true)}
    onpointerleave={() => handleCoinHover(tile, i, false)}
  >
    <Float
      floatingRange={[
        [0, 0],
        [0, 0],
        [-0.05, 0.05],
      ]}
    >
      {#if coinHovered}
        <T.Mesh rotation={[-Math.PI / 2, 0, 0]}>
          <T.PlaneGeometry args={[0.35, 0.35]} />
          <ImageMaterial {texture} />
        </T.Mesh>
      {/if}
      <T.Mesh rotation={[-Math.PI / 2, 0, 0]}>
        <T.PlaneGeometry args={[0.3, 0.3]} />
        <ImageMaterial {texture} />
      </T.Mesh>
    </Float>
  </T.Group>
{/if}
