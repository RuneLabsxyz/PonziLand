<script lang="ts">
  import accountState from '$lib/account.svelte';
  import { BuildingLand } from '$lib/api/land/building_land';
  import { padAddress } from '$lib/utils';
  import data from '$profileData';
  import { Instance } from '@threlte/extras';
  import {
    NearestFilter,
    TextureLoader,
    type InstancedMesh as TInstancedMesh
  } from 'three';
  import type { LandTile } from './landTile';

  let {
    landTiles,
    instancedMesh,
  }: {
    landTiles: LandTile[];
    instancedMesh: TInstancedMesh | undefined;
  } = $props();

  let address = $derived(accountState.address);

  // Load textures for different owner types
  let crownTexture = new TextureLoader().load('/ui/icons/Icon_Crown.png');
  crownTexture.magFilter = NearestFilter;
  crownTexture.minFilter = NearestFilter;
  crownTexture.colorSpace = 'srgb';

  // You can add more textures for different AI agents here
  let agentTextures: Record<string, any> = {
    crown: crownTexture,
    // agent1: new TextureLoader().load('/ui/icons/agent1.png'),
    // agent2: new TextureLoader().load('/ui/icons/agent2.png'),
  };

  let visibleTiles = $derived.by(() => {
    return landTiles
      .map((tile, index) => {
        const land = tile.land;
        let shouldShow = false;
        let ownerType: string | undefined;

        if (BuildingLand.is(land)) {
          const isOwner =
            padAddress(land?.owner ?? '') === padAddress(address ?? '');

          if (isOwner) {
            shouldShow = true;
            ownerType = 'crown';
          } else {
            const aiAgent = data.aiAgents.find(
              (agent) => padAddress(agent.address) === padAddress(land.owner),
            );
            if (aiAgent) {
              shouldShow = true;
              ownerType = getAIAgentType(aiAgent);
            }
          }
        }

        return {
          tile,
          index,
          shouldShow,
          ownerType,
        };
      })
      .filter((item) => item.shouldShow);
  });

  function getAIAgentType(aiAgent: any): string {
    // Map AI agents to texture types
    const agentMapping: Record<string, string> = {
      agent1: 'agent1',
      agent2: 'agent2',
      // Add more mappings as needed
    };
    return agentMapping[aiAgent.name] || 'crown'; // Default to crown if no specific mapping
  }

  function getCurrentTexture(ownerType: string) {
    return agentTextures[ownerType] || crownTexture;
  }
</script>

{#each visibleTiles as { tile, index, ownerType }}
  <Instance
    position={[
      tile.position[0] - 0.4,
      tile.position[1] + 0.1, // Elevated above the tile
      tile.position[2] - 0.5,
    ]}
    rotation={[-Math.PI / 2, 0, ownerType === 'crown' ? Math.PI / 6 : 0]}
    scale={[0.8, 0.8, 0.8]}
  />
{/each}
