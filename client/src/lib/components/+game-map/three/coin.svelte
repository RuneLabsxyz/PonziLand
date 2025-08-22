<script lang="ts">
  import accountState from '$lib/account.svelte';
  import { BuildingLand } from '$lib/api/land/buildingLand';
  import { useDojo } from '$lib/contexts/dojo';
  import { claimSingleLand, claimStore } from '$lib/stores/claim.svelte';
  import { clearPending, nukeStore, setPending } from '$lib/stores/nuke.svelte';
  import { gameSounds } from '$lib/stores/sfx.svelte';
  import { landStore } from '$lib/stores/store.svelte';
  import { padAddress } from '$lib/utils';
  import { createLandWithActions } from '$lib/utils/land-actions';
  import { getAggregatedTaxes, type TaxData } from '$lib/utils/taxes';
  import { useThrelte } from '@threlte/core';
  import { Float, Instance } from '@threlte/extras';
  import type { InstancedMesh as TInstancedMesh } from 'three';
  import type { LandTile } from './landTile';
  import type { CoinHoverShaderMaterial } from './utils/coin-hover-shader';

  const dojo = useDojo();

  const { camera } = useThrelte();

  let {
    tile,
    i,
    instancedMesh,
    positionOffset,
    scale,
    shaderMaterial,
  }: {
    tile: LandTile;
    i: number;
    instancedMesh: TInstancedMesh | undefined;
    positionOffset: [number, number, number];
    scale: number;
    shaderMaterial: CoinHoverShaderMaterial | undefined;
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

  const handleCoinClick = async (tile: LandTile, i: number) => {
    if (animating || !timing) return;

    if (accountState.walletAccount === undefined) {
      console.error('No wallet account found');
      return;
    }

    fetchTaxes();

    const land = createLandWithActions(
      tile.land as BuildingLand,
      landStore.getAllLands,
    );

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
  };

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
  let coinHovered = $state(false);
  let lastHoveredIndex = $state(-1);

  function onPointerEnter(event: any) {
    // Get the instance ID directly from the intersection
    const instanceId = event.intersections[0]?.instanceId;

    if (instanceId !== undefined) {
      lastHoveredIndex = instanceId;
      handleCoinHover(instanceId, true);
      coinHovered = true;
    }
  }

  function onPointerLeave() {
    if (lastHoveredIndex !== -1) {
      handleCoinHover(lastHoveredIndex, false);
      lastHoveredIndex = -1;
      coinHovered = false;
    }
  }

  function handleCoinHover(index: number, isHovering: boolean) {
    if (shaderMaterial) {
      shaderMaterial.setInstanceHover(index, isHovering);
    }
    document.body.classList.toggle('cursor-pointer', isHovering);
  }

  // Ownership check is now handled by parent component filtering
  let isOwner = $derived(true);

  let coinPosition: [number, number, number] = $derived([
    derivedTile.position[0] + positionOffset[0],
    derivedTile.position[1] + 0.1,
    derivedTile.position[2] + positionOffset[2],
  ]);
</script>

{#if isOwner && !animating && timing}
  <Instance
    position={coinPosition}
    rotation={[-Math.PI / 2, 0, 0]}
    onclick={() => handleCoinClick(tile, i)}
    onpointerenter={(e: any) => onPointerEnter(e)}
    onpointerleave={() => onPointerLeave()}
    {scale}
  />
{/if}
