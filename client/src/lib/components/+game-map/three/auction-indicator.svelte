<script lang="ts">
  import { AuctionLand } from '$lib/api/land/auction_land';
  import { T } from '@threlte/core';
  import { Instance, InstancedMesh } from '@threlte/extras';
  import {
    NearestFilter,
    TextureLoader,
    type InstancedMesh as TInstancedMesh,
  } from 'three';
  import type { LandTile } from './landTile';
  import { GRID_SIZE } from '$lib/const';
  import { onDestroy } from 'svelte';

  let {
    landTiles,
    instancedMesh,
  }: {
    landTiles: LandTile[];
    instancedMesh: TInstancedMesh | undefined;
  } = $props();

  // Load auction texture
  let auctionTexture = new TextureLoader().load('/ui/icons/Icon_Auction.png');
  auctionTexture.magFilter = NearestFilter;
  auctionTexture.minFilter = NearestFilter;
  auctionTexture.colorSpace = 'srgb';

  // Filter auction tiles
  let auctionTiles = $derived.by(() => {
    if (!landTiles.length) return [];

    return landTiles
      .filter((tile) => AuctionLand.is(tile.land))
      .map((tile, tileIndex) => ({
        tile,
        tileIndex,
      }));
  });

  onDestroy(() => {
    // Dispose auction texture
    auctionTexture?.dispose();
  });
</script>

<!-- Auction icons for auction lands -->
{#if auctionTiles.length > 0}
  <InstancedMesh
    bind:ref={instancedMesh}
    limit={GRID_SIZE * GRID_SIZE}
    range={GRID_SIZE * GRID_SIZE}
    frustumCulled={false}
  >
    <T.PlaneGeometry args={[0.5, 0.5]} />
    <T.MeshBasicMaterial map={auctionTexture} alphaTest={0.5} transparent />
    {#each auctionTiles as { tile }}
      <Instance
        position={[tile.position[0], tile.position[1] + 0.1, tile.position[2]]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[0.8, 0.8, 0.8]}
      />
    {/each}
  </InstancedMesh>
{/if}
