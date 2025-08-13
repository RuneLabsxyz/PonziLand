<script lang="ts">
  import { AuctionLand } from '$lib/api/land/auction_land';
  import { BuildingLand } from '$lib/api/land/building_land';
  import accountState from '$lib/account.svelte';
  import { padAddress } from '$lib/utils';
  import { openLandInfoWidget } from '$lib/components/+game-ui/game-ui.svelte';
  import { Button } from '$lib/components/ui/button';
  import { nukeStore } from '$lib/stores/nuke.store.svelte';
  import { gameSounds } from '$lib/stores/sfx.svelte';
  import {
    landStore,
    selectedLand,
    selectedLandWithActions,
  } from '$lib/stores/store.svelte';
  import { T, useTask } from '@threlte/core';
  import {
    HTML,
    InstancedMesh,
    InstancedSprite,
    Instance,
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
  import OwnerIndicator from './owner-indicator.svelte';
  import NukeTimeDisplay from './nuke-time-display.svelte';
  import { devsettings } from './utils/devsettings.store.svelte';
  import { CoinHoverShaderMaterial } from './utils/coin-hover-shader';
  import { BufferAttribute, Clock } from 'three';

  let coinShaderMaterial: CoinHoverShaderMaterial | undefined = $state();
  let clock = new Clock();

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

  const nukeAtlasMeta = [
    {
      url: '/land-display/nuke-animation.png',
      type: 'rowColumn',
      width: 5,
      height: 7,
      animations: [
        { name: 'default', frameRange: [0, 34] },
        { name: 'empty', frameRange: [34, 34] },
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

  const ownerAtlasMeta = [
    {
      url: '/ui/icons/Icon_Crown.png', // You'll need to create this spritesheet
      type: 'rowColumn',
      width: 1, // Adjust based on your spritesheet
      height: 1, // Adjust based on your spritesheet
      animations: [
        { name: 'crown', frameRange: [0, 0] },
        // Add more AI agent frames as needed
      ],
    },
  ] as const satisfies SpritesheetMetadata;
  const ownerAtlas =
    buildSpritesheet.from<typeof ownerAtlasMeta>(ownerAtlasMeta);

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
        let skin = 'default';

        if (BuildingLand.is(tile)) {
          tokenSymbol = tile?.token?.symbol ?? 'empty';
          skin = tile?.token?.images?.skin ?? 'empty';
        }

        if (AuctionLand.is(tile)) {
          tokenSymbol = 'auction';
          skin = 'auction';
        }

        const gridX = tile.location.x;
        const gridY = tile.location.y;

        return new LandTile(
          [gridX, 1, gridY],
          tokenSymbol,
          skin,
          tile.level,
          tile,
        );
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
    if (ownerSprite) {
      ownerSprite.update();
    }
  });

  let roadSprite: any = $state();
  let biomeSprite: any = $state();
  let buildingSprite: any = $state();
  let nukeSprite: any = $state();
  let ownerSprite: any = $state();

  // Camera zoom threshold detection
  const ZOOM_THRESHOLD = 100; // Adjust this value as needed
  let isUnzoomed = $state(false);

  // Use useTask to continuously monitor camera zoom changes
  let lastLoggedZoom = 0;
  useTask(() => {
    if (gameStore.cameraControls?.camera) {
      const currentZoom = gameStore.cameraControls.camera.zoom;

      // Log zoom changes (throttled to avoid spam)
      if (Math.abs(currentZoom - lastLoggedZoom) > 1) {
        lastLoggedZoom = currentZoom;
      }

      const newIsUnzoomed = currentZoom <= ZOOM_THRESHOLD;
      if (newIsUnzoomed !== isUnzoomed) {
        isUnzoomed = newIsUnzoomed;
        console.log(
          'Zoom state changed - isUnzoomed:',
          isUnzoomed,
          'zoom:',
          currentZoom,
        );
      }
    }
  });

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
      gameSounds.play('biomeSelect');
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
      // gameSounds.play('hover');
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

  // Update your texture loading section
  let texture = new TextureLoader().load(
    '/ui/icons/Icon_Coin2.png',
    (loadedTexture) => {
      loadedTexture.magFilter = NearestFilter;
      loadedTexture.minFilter = NearestFilter;

      // Create the shader material after texture loads
      coinShaderMaterial = new CoinHoverShaderMaterial(loadedTexture);
    },
  );

  // Add animation loop for shader time uniform
  useTask(() => {
    if (coinShaderMaterial) {
      coinShaderMaterial.updateTime(clock.getElapsedTime());
    }
  });

  let crownTexture = new TextureLoader().load('/ui/icons/Icon_Crown.png');
  crownTexture.magFilter = NearestFilter;
  crownTexture.minFilter = NearestFilter;
  crownTexture.colorSpace = 'srgb';

  // Add shield texture loading
  let shieldTexture = new TextureLoader().load('/ui/icons/Icon_ShieldBlue.png');
  shieldTexture.magFilter = NearestFilter;
  shieldTexture.minFilter = NearestFilter;
  shieldTexture.colorSpace = 'srgb';

  let ownerInstancedMesh: TInstancedMesh | undefined = $state();
  let coinInstancedMesh: TInstancedMesh | undefined = $state();
  let shieldInstancedMesh: TInstancedMesh | undefined = $state();
  let darkOverlayMesh: TInstancedMesh | undefined = $state();

  // Calculate owned lands for unzoomed view
  let ownedLands = $derived.by(() => {
    if (!isUnzoomed || !accountState.address) return [];

    return landTiles.filter((tile) => {
      if (!BuildingLand.is(tile.land)) return false;
      return (
        padAddress(tile.land.owner ?? '') ===
        padAddress(accountState.address ?? '')
      );
    });
  });
</script>

<T is={Group}>
  {#await Promise.all( [buildingAtlas.spritesheet, biomeAtlas.spritesheet, roadAtlas.spritesheet, nukeAtlas.spritesheet, fogAtlas.spritesheet, ownerAtlas.spritesheet], ) then [buildingSpritesheet, biomeSpritesheet, roadSpritesheet, nukeSpritesheet, fogSpritesheet, ownerSpritesheet]}
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
        spritesheet={biomeSpritesheet}
        bind:ref={biomeSprite}
      >
        <BiomeSprite {landTiles} {biomeSpritesheet} />
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
        <BuildingSprite {landTiles} {buildingSpritesheet} />
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

    // In your main component, update the coin section:

    {#if devsettings.showCoins && coinShaderMaterial}
      <InstancedMesh
        bind:ref={coinInstancedMesh}
        limit={gridSize * gridSize}
        count={gridSize * gridSize}
        frustumCulled={false}
      >
        <T.PlaneGeometry args={[0.3, 0.3]} />
        <T is={coinShaderMaterial} />
        {#each landTiles as tile, i}
          <Coin
            {tile}
            {i}
            instancedMesh={coinInstancedMesh}
            {isUnzoomed}
            shaderMaterial={coinShaderMaterial}
          />
        {/each}
      </InstancedMesh>
    {/if}

    {#if devsettings.showOwnerIndicator && !isUnzoomed}
      <OwnerIndicator {landTiles} instancedMesh={ownerInstancedMesh} />
    {/if}

    {#if devsettings.showNukeTimes}
      <NukeTimeDisplay {landTiles} isShieldMode={isUnzoomed} />
    {/if}

    <!-- Dark overlay for non-owned lands when unzoomed -->
    {#if isUnzoomed && ownedLands.length > 0}
      <InstancedMesh
        bind:ref={darkOverlayMesh}
        limit={gridSize * gridSize}
        count={ownedLands.length}
        frustumCulled={false}
      >
        <T.PlaneGeometry args={[1, 1]} />
        <T.MeshBasicMaterial
          color={0x000000}
          transparent={true}
          opacity={0.4}
          alphaTest={0.01}
        />
        {#each ownedLands as tile}
          <Instance
            position={[
              tile.position[0],
              tile.position[1] + 0.05, // Slightly above the tile to overlay
              tile.position[2],
            ]}
            rotation={[-Math.PI / 2, 0, 0]}
            frustumCulled={false}
          />
        {/each}
      </InstancedMesh>
    {/if}
  {/await}
</T>

<!-- Button overlay using Threlte HTML component -->
{#if devsettings.showLandOverlay && selectedLandTilePosition && !isUnzoomed}
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
