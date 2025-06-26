<script lang="ts">
  import { AuctionLand } from '$lib/api/land/auction_land';
  import { BuildingLand } from '$lib/api/land/building_land';
  import { openLandInfoWidget } from '$lib/components/+game-ui/game-ui.svelte';
  import { Button } from '$lib/components/ui/button';
  import { nukeStore } from '$lib/stores/nuke.store.svelte';
  import {
    landStore,
    selectedLand,
    selectedLandWithActions,
  } from '$lib/stores/store.svelte';
  import { T, useThrelte } from '@threlte/core';
  import {
    HTML,
    InstancedMesh,
    InstancedSprite,
    buildSpritesheet,
    type SpritesheetMetadata,
  } from '@threlte/extras';
  import { onMount } from 'svelte';
  import {
    Group,
    MeshBasicMaterial,
    NearestFilter,
    Object3D,
    PlaneGeometry,
    InstancedMesh as TInstancedMesh,
    TextureLoader,
  } from 'three';
  import LandRatesOverlay from '../land/land-rates-overlay.svelte';
  import BiomeSprite from './biome-sprite.svelte';
  import { biomeAtlasMeta } from './biomes';
  import BuildingSprite from './building-sprite.svelte';
  import { buildingAtlasMeta } from './buildings';
  import Coin from './coin.svelte';
  import { cursorStore } from './cursor.store.svelte';
  import FogSprite from './fog-sprite.svelte';
  import { gameStore } from './game.store.svelte';
  import { LandTile } from './landTile';
  import NukeSprite from './nuke-sprite.svelte';
  import { devsettings } from './utils/devsettings.store.svelte';

  let billboarding = $derived(devsettings.billboarding);

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

  // Add this after your existing atlas definitions:
  const nukeAtlasMeta = [
    {
      url: '/land-display/nuke-animation.png',
      type: 'rowColumn',
      width: 5,
      height: 7,
      animations: [
        { name: 'default', frameRange: [0, 35] },
        { name: 'empty', frameRange: [35, 35] },
      ],
    },
  ] as const satisfies SpritesheetMetadata;
  const nukeAtlas = buildSpritesheet.from<typeof nukeAtlasMeta>(nukeAtlasMeta);

  // FOG OF WAR ATLAS
  const fogAtlasMeta = [
    {
      url: '/land-display/fog.png',
      type: 'rowColumn',
      width: 3,
      height: 3,
      animations: [{ name: 'default', frameRange: [0, 8] }],
    },
  ] as const satisfies SpritesheetMetadata;
  const fogAtlas = buildSpritesheet.from<typeof fogAtlasMeta>(fogAtlasMeta);

  let landTiles: LandTile[] = $state([]);

  // At the top, outside of any reactive context:
  const planeGeometry = new PlaneGeometry(1, 1);
  const roadTexture = new TextureLoader().load(
    '/land-display/road.png',
    (data) => {
      data.colorSpace = 'srgb';
    },
  );
  const planeMaterial = new MeshBasicMaterial({
    map: roadTexture,
    transparent: true,
    opacity: 1,
    alphaTest: 0.1,
  });

  let interactionPlanes: TInstancedMesh | undefined = $state();
  onMount(() => {
    // Only run once
    interactionPlanes = new TInstancedMesh(
      planeGeometry,
      planeMaterial,
      gridSize * gridSize,
    );

    const tempObject = new Object3D();

    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        const index = x + y * gridSize;
        tempObject.position.set(y, 1 - 0.03, x); // adjust y as needed
        tempObject.rotation.x = -Math.PI / 2;
        tempObject.updateMatrix();
        interactionPlanes.setMatrixAt(index, tempObject.matrix);
      }
    }
    interactionPlanes.instanceMatrix.needsUpdate = true;
  });

  onMount(() => {
    landStore.getAllLands().subscribe((tiles) => {
      landTiles = tiles.map((tile, index) => {
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
    });
  });

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
    if (nukeSprite) {
      nukeSprite.update();
    }
  });

  let roadSprite: any = $state();
  let biomeSprite: any = $state();
  let buildingSprite: any = $state();
  let nukeSprite: any = $state();

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

  // Filter only nuking tiles for the nuke layer
  let nukingTiles = $derived.by(() => {
    return landTiles.filter(
      (tile) => nukeStore.nuking[Number(tile.land.locationString)],
    );
  });

  let texture = new TextureLoader().load('/ui/icons/Icon_Coin2.png');
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.colorSpace = 'srgb';

  let coinInstancedMesh: TInstancedMesh | undefined = $state();
</script>

<T is={Group}>
  {#await Promise.all( [buildingAtlas.spritesheet, biomeAtlas.spritesheet, roadAtlas.spritesheet, nukeAtlas.spritesheet, fogAtlas.spritesheet], ) then [buildingSpritesheet, resolvedBiomeSpritesheet, roadSpritesheet, nukeSpritesheet, fogSpritesheet]}
    <!-- Transparent interaction planes layer (now also renders roads) -->
    {#if interactionPlanes && devsettings.showRoads}
      <T
        is={interactionPlanes}
        interactive={true}
        onpointerenter={handlePlaneHover}
        onpointerleave={handlePlaneLeave}
        onclick={handleClickToSelectHovered}
      />
    {/if}

    <!-- Biome sprites (background layer) -->
    {#if devsettings.showBiomes}
      <InstancedSprite
        count={gridSize * gridSize}
        {billboarding}
        spritesheet={resolvedBiomeSpritesheet}
        bind:ref={biomeSprite}
      >
        <BiomeSprite {landTiles} />
      </InstancedSprite>
    {/if}

    <!-- FOG OF WAR LAYER -->
    {#if devsettings.showFog}
      <InstancedSprite
        count={gridSize * gridSize}
        {billboarding}
        spritesheet={fogSpritesheet}
        fps={1}
      >
        <FogSprite {landTiles} />
      </InstancedSprite>
    {/if}

    <!-- Building sprites (foreground layer) -->
    {#if devsettings.showBuildings}
      <InstancedSprite
        count={gridSize * gridSize}
        {billboarding}
        spritesheet={buildingSpritesheet}
        bind:ref={buildingSprite}
      >
        <BuildingSprite {landTiles} />
      </InstancedSprite>
    {/if}

    {#if devsettings.showNukes}
      <InstancedSprite
        count={gridSize * gridSize}
        {billboarding}
        spritesheet={nukeSpritesheet}
        bind:ref={nukeSprite}
        fps={10}
      >
        <NukeSprite {landTiles} />
      </InstancedSprite>
    {/if}

    {#if devsettings.showCoins}
      <InstancedMesh
        bind:ref={coinInstancedMesh}
        limit={gridSize * gridSize}
        count={gridSize * gridSize}
        frustumCulled={false}
      >
        <T.PlaneGeometry args={[0.3, 0.3]} />
        <T.MeshBasicMaterial map={texture} transparent />
        {#each landTiles as tile, i}
          {#if tile.land.type === 'building'}
            <Coin {tile} {i} instancedMesh={coinInstancedMesh} />
          {/if}
        {/each}
      </InstancedMesh>
    {/if}
  {/await}
</T>

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
{#if devsettings.showLandOverlay && selectedLandTilePosition}
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
