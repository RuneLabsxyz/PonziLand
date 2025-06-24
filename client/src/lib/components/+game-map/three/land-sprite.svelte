<script lang="ts">
  import { AuctionLand } from '$lib/api/land/auction_land';
  import { BuildingLand } from '$lib/api/land/building_land';
  import { openLandInfoWidget } from '$lib/components/+game-ui/game-ui.svelte';
  import { Button } from '$lib/components/ui/button';
  import {
    landStore,
    selectedLand,
    selectedLandWithActions,
  } from '$lib/stores/store.svelte';
  import { T, useThrelte } from '@threlte/core';
  import {
    HTML,
    InstancedSprite,
    buildSpritesheet,
    type SpritesheetMetadata,
  } from '@threlte/extras';
  import { onMount } from 'svelte';
  import {
    Group,
    InstancedMesh,
    MeshBasicMaterial,
    Object3D,
    PlaneGeometry,
  } from 'three';
  import LandRatesOverlay from '../land/land-rates-overlay.svelte';
  import BiomeSprite from './biome-sprite.svelte';
  import { biomeAtlasMeta } from './biomes';
  import BuildingSprite from './building-sprite.svelte';
  import { buildingAtlasMeta } from './buildings';
  import { cursorStore } from './cursor.store.svelte';
  import { gameStore } from './game.store.svelte';
  import { LandTile } from './landTile';
  import RoadSprite from './road-sprite.svelte';
  import Coin from './coin.svelte';
  import { padAddress } from '$lib/utils';
  import accountState from '$lib/account.svelte';

  let { billboarding = false } = $props();

  const gridSize = 64;

  const buildingAtlas =
    buildSpritesheet.from<typeof buildingAtlasMeta>(buildingAtlasMeta);

  const biomeAtlas =
    buildSpritesheet.from<typeof biomeAtlasMeta>(biomeAtlasMeta);

  const roadAtlasMeta = [
    {
      url: '/land-display/road.png',
      type: 'rowColumn',
      width: 1,
      height: 1,
      animations: [{ name: 'default', frameRange: [0, 0] }],
    },
  ] as const satisfies SpritesheetMetadata;
  const roadAtlas = buildSpritesheet.from<typeof roadAtlasMeta>(roadAtlasMeta);

  let landTiles: LandTile[] = $state([]);

  const planeGeometry = new PlaneGeometry(1, 1);
  const planeMaterial = new MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    alphaTest: 0.1,
  });

  onMount(() => {
    landStore.getAllLands().subscribe((tiles) => {
      landTiles = tiles
        .sort((a, b) => {
          const aValue = a.location.x + a.location.y * gridSize;
          const bValue = b.location.x + b.location.y * gridSize;
          return aValue - bValue;
        })
        .map((tile, index) => {
          let tokenSymbol = 'empty';

          if (BuildingLand.is(tile)) {
            tokenSymbol = tile?.token?.symbol ?? 'empty';
          }

          if (AuctionLand.is(tile)) {
            tokenSymbol = 'auction';
          }

          const gridX = tile.location.x;
          const gridY = tile.location.y;

          return new LandTile([gridX, 1, gridY], tokenSymbol, tile.level, tile);
        });
      setupInteractionPlanes();
    });
  });

  let interactionPlanes: InstancedMesh | undefined = $state();

  function setupInteractionPlanes() {
    if (!landTiles.length) return;

    interactionPlanes = new InstancedMesh(
      planeGeometry,
      planeMaterial,
      landTiles.length,
    );

    const tempObject = new Object3D();

    landTiles.forEach((tile, index) => {
      tempObject.position.set(
        tile.position[0],
        tile.position[1] + 1, // Slightly above the ground
        tile.position[2],
      );
      tempObject.rotation.x = -Math.PI / 2;
      tempObject.updateMatrix();
      if (interactionPlanes) {
        interactionPlanes.setMatrixAt(index, tempObject.matrix);
      }
    });

    interactionPlanes.instanceMatrix.needsUpdate = true;
  }

  $effect(() => {
    if (buildingSprite) {
      buildingSprite.update();
    }
    if (biomeSprite) {
      biomeSprite.update();
    }
    if (roadSprite) {
      roadSprite.update();
    }
  });

  let roadSprite: any = $state();
  let biomeSprite: any = $state();
  let buildingSprite: any = $state();

  const { camera } = useThrelte();

  // Function to be called by the global click listener
  function handleClickToSelectHovered() {
    if (cursorStore.hoveredTileIndex !== undefined) {
      const tile = landTiles[cursorStore.hoveredTileIndex];

      if (gameStore.cameraControls) {
        gameStore.cameraControls.setLookAt(
          tile.position[0],
          50, // Slightly above the tile
          tile.position[2],
          tile.position[0],
          tile.position[1],
          tile.position[2],
          true,
        );

        if (cursorStore.selectedTileIndex === cursorStore.hoveredTileIndex) {
          gameStore.cameraControls.zoomTo(250, true);
        }
      }
      cursorStore.selectedTileIndex = cursorStore.hoveredTileIndex;
      selectedLand.value = tile.land;
    } else {
      // If there's no hovered tile when clicked, deselect any currently selected tile
      cursorStore.selectedTileIndex = undefined;
    }
  }

  // Handle plane interactions (only for hover now)
  function handlePlaneHover(event: any) {
    const instanceId = event.instanceId;
    if (instanceId !== undefined && landTiles[instanceId]) {
      cursorStore.hoveredTileIndex = instanceId;
      const tile = landTiles[instanceId];

      document.body.classList.add('cursor-pointer');
    }
  }

  function handlePlaneLeave() {
    cursorStore.hoveredTileIndex = undefined;
    document.body.classList.remove('cursor-pointer');
  }

  let selectedLandTilePosition: [number, number, number] | undefined =
    $state(undefined);

  $effect(() => {
    if (
      cursorStore.selectedTileIndex !== undefined &&
      landTiles[cursorStore.selectedTileIndex]
    ) {
      const basePosition = landTiles[cursorStore.selectedTileIndex].position;
      selectedLandTilePosition = [
        basePosition[0],
        basePosition[1] + 0.1,
        basePosition[2],
      ];
    } else {
      selectedLandTilePosition = undefined;
    }
  });
</script>

<T is={Group}>
  {#await Promise.all( [buildingAtlas.spritesheet, biomeAtlas.spritesheet, roadAtlas.spritesheet], ) then [buildingSpritesheet, resolvedBiomeSpritesheet, roadSpritesheet]}
    <!-- Transparent interaction planes layer (still needed for hover detection) -->
    {#if interactionPlanes}
      <T
        is={interactionPlanes}
        interactive={true}
        onpointerenter={handlePlaneHover}
        onpointerleave={handlePlaneLeave}
        onclick={handleClickToSelectHovered}
      />
    {/if}

    <!-- Road sprites-->
    <InstancedSprite
      count={gridSize * gridSize}
      autoUpdate={false}
      playmode={'PAUSE'}
      {billboarding}
      spritesheet={roadSpritesheet}
      bind:ref={roadSprite}
    >
      <RoadSprite {landTiles} />
    </InstancedSprite>

    <!-- Biome sprites (background layer) -->
    <InstancedSprite
      count={gridSize * gridSize}
      {billboarding}
      spritesheet={resolvedBiomeSpritesheet}
      bind:ref={biomeSprite}
    >
      <BiomeSprite {landTiles} />
    </InstancedSprite>

    <!-- Building sprites (foreground layer) -->
    <InstancedSprite
      count={gridSize * gridSize}
      {billboarding}
      spritesheet={buildingSpritesheet}
      bind:ref={buildingSprite}
    >
      <BuildingSprite {landTiles} />
    </InstancedSprite>
  {/await}
</T>
{#each landTiles as tile, i}
  {#if tile.land.type === 'building'}
    <Coin {tile} {i} />
  {/if}
{/each}
<!-- {#each landTiles as tile, i}
  <Text
    position={[tile.position[0] - 1, tile.position[1] + 0.1, tile.position[2]]}
    text="OKDEPART"
    fontSize={0.1}
    color="#ffffff"
    rotation={[-Math.PI / 2, 0, 0]}
    {billboarding}
  />
{/each} -->
<!-- Button overlay using Threlte HTML component -->
{#if selectedLandTilePosition}
  {@const land = selectedLandWithActions()?.value}
  <HTML
    portal={document.getElementById('game-canvas') ?? document.body}
    position={selectedLandTilePosition}
    zIndexRange={[10, 0]}
    distanceFactor={0.01}
  >
    {#if land}
      <LandRatesOverlay {land} />
      <Button
        class="absolute top-[50px] -translate-y-full -translate-x-1/2 z-20"
        size="sm"
        onclick={() => {
          openLandInfoWidget(land);
        }}
      >
        BUY LAND
      </Button>
    {/if}
  </HTML>
{/if}
