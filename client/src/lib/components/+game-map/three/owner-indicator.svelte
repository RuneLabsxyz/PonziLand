<script lang="ts">
  import accountState from '$lib/account.svelte';
  import { BuildingLand } from '$lib/api/land/building_land';
  import { padAddress } from '$lib/utils';
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

  let {
    landTiles,
    instancedMesh,
  }: {
    landTiles: LandTile[];
    instancedMesh: TInstancedMesh | undefined;
  } = $props();

  let address = $derived(accountState.address);

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

  // Group tiles by owner type for efficient rendering
  let tilesByOwnerType = $derived.by(() => {
    const groups: Record<string, { tile: LandTile; tileIndex: number }[]> = {};

    landTiles.forEach((tile, tileIndex) => {
      const land = tile.land;
      let ownerType: string | undefined;

      if (BuildingLand.is(land)) {
        const isOwner =
          padAddress(land?.owner ?? '') === padAddress(address ?? '');

        if (isOwner) {
          ownerType = 'crown';
        } else {
          const aiAgent = data.aiAgents.find(
            (agent) => padAddress(agent.address) === padAddress(land.owner),
          );
          if (aiAgent) {
            ownerType = getAIAgentType(aiAgent);
          }
        }

        if (ownerType) {
          if (!groups[ownerType]) {
            groups[ownerType] = [];
          }
          groups[ownerType].push({ tile, tileIndex });
        }
      }
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
