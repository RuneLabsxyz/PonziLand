<script lang="ts">
  import accountState from '$lib/account.svelte';
  import { BuildingLand } from '$lib/api/land/building_land';
  import data from '$profileData';
  import { T } from '@threlte/core';
  import { Instance, InstancedMesh } from '@threlte/extras';
  import {
    NearestFilter,
    TextureLoader,
    type InstancedMesh as TInstancedMesh,
  } from 'three';
  import type { LandTile } from './landTile';
  import { GRID_SIZE } from '$lib/const';
  import type { LandTileStore } from '$lib/api/land_tiles.svelte';

  let {
    landTiles,
    instancedMesh,
    store,
  }: {
    landTiles: LandTile[];
    instancedMesh: TInstancedMesh | undefined;
    store: LandTileStore;
  } = $props();

  // Load crown texture
  let crownTexture = new TextureLoader().load('/ui/icons/Icon_Crown.png');
  crownTexture.magFilter = NearestFilter;
  crownTexture.minFilter = NearestFilter;
  crownTexture.colorSpace = 'srgb';

  // Load AI agent textures from profile data
  let agentTextures: Record<string, any> = {};

  // Load textures for each AI agent
  data.aiAgents.forEach((agent) => {
    const texture = new TextureLoader().load(agent.badgeImage);
    texture.magFilter = NearestFilter;
    texture.minFilter = NearestFilter;
    texture.colorSpace = 'srgb';
    agentTextures[agent.name.toLowerCase()] = texture;
  });

  // Optimized owner tiles using ownership index for faster lookups
  let ownerTiles = $derived.by(() => {
    if (!landTiles.length) return [];

    // Get all ownership data we need
    const allOwnershipData = new Map<number, string>();

    // Add owned tiles by current user
    if (accountState.address) {
      const ownedIndices = store.getOwnedLandIndices(accountState.address);
      const ownedIndicesSet = new Set(ownedIndices);
      
      landTiles.forEach((tile) => {
        if (!BuildingLand.is(tile.land)) return;
        const landIndex = tile.land.location.x * GRID_SIZE + tile.land.location.y;
        if (ownedIndicesSet.has(landIndex)) {
          allOwnershipData.set(landIndex, 'crown');
        }
      });
    }

    // Add AI agent owned tiles
    data.aiAgents.forEach((agent) => {
      const agentIndices = store.getOwnedLandIndices(agent.address);
      const agentIndicesSet = new Set(agentIndices);
      
      landTiles.forEach((tile) => {
        if (!BuildingLand.is(tile.land)) return;
        const landIndex = tile.land.location.x * GRID_SIZE + tile.land.location.y;
        if (agentIndicesSet.has(landIndex)) {
          allOwnershipData.set(landIndex, getAIAgentType(agent));
        }
      });
    });

    // Filter tiles using the ownership data
    return landTiles.filter((tile) => {
      if (!BuildingLand.is(tile.land)) return false;
      const landIndex = tile.land.location.x * GRID_SIZE + tile.land.location.y;
      return allOwnershipData.has(landIndex);
    }).map((tile, tileIndex) => ({
      tile,
      tileIndex,
      ownerType: allOwnershipData.get(tile.land.location.x * GRID_SIZE + tile.land.location.y)!
    }));
  });

  // Group tiles by owner type for efficient rendering
  let tilesByOwnerType = $derived.by(() => {
    const groups: Record<string, { tile: LandTile; tileIndex: number }[]> = {};

    ownerTiles.forEach(({ tile, tileIndex, ownerType }) => {
      if (!groups[ownerType]) {
        groups[ownerType] = [];
      }
      groups[ownerType].push({ tile, tileIndex });
    });

    return groups;
  });

  function getAIAgentType(aiAgent: any): string {
    return aiAgent.name.toLowerCase();
  }
</script>

<!-- Crown instances for player-owned land -->
{#if tilesByOwnerType.crown && tilesByOwnerType.crown.length > 0}
  <InstancedMesh
    bind:ref={instancedMesh}
    limit={GRID_SIZE * GRID_SIZE}
    range={GRID_SIZE * GRID_SIZE}
    frustumCulled={false}
  >
    <T.PlaneGeometry args={[0.3, 0.3]} />
    <T.MeshBasicMaterial map={crownTexture} alphaTest={0.5} transparent />
    {#each tilesByOwnerType.crown as { tile }}
      <Instance
        position={[
          tile.position[0] - 0.4,
          tile.position[1] + 0.1,
          tile.position[2] - 0.5,
        ]}
        rotation={[-Math.PI / 2, 0, Math.PI / 6]}
        scale={[0.8, 0.8, 0.8]}
      />
    {/each}
  </InstancedMesh>
{/if}

<!-- AI Agent instances for each agent type -->
{#each Object.entries(tilesByOwnerType) as [ownerType, tiles]}
  {#if ownerType !== 'crown' && tiles.length > 0 && agentTextures[ownerType]}
    <InstancedMesh
      limit={GRID_SIZE * GRID_SIZE}
      range={GRID_SIZE * GRID_SIZE}
      frustumCulled={false}
    >
      <T.PlaneGeometry args={[0.3, 0.3]} />
      <T.MeshBasicMaterial
        map={agentTextures[ownerType]}
        alphaTest={0.5}
        transparent
      />
      {#each tiles as { tile }}
        <Instance
          position={[
            tile.position[0] - 0.4,
            tile.position[1] + 0.1,
            tile.position[2] - 0.5,
          ]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[0.8, 0.8, 0.8]}
        />
      {/each}
    </InstancedMesh>
  {/if}
{/each}
