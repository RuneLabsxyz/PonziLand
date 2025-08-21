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
  import type { LandTileStore } from '$lib/api/land_tiles.svelte';

  // Allow passing a custom land store (for tutorials)
  interface Props {
    store?: LandTileStore;
  }

  let { store = landStore }: Props = $props();
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
    Color,
  } from 'three';
  import LandRatesOverlay from '../land/land-rates-overlay.svelte';
  import LandTileSprite from './land-tile-sprite.svelte';
  import { biomeAtlasMeta } from './biomes';
  import { buildingAtlasMeta } from './buildings';
  import Coin from './coin.svelte';
  import RoadSprite from './road-sprite.svelte';
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
  import { GRID_SIZE } from '$lib/const';
  import { configValues } from '$lib/stores/config.store.svelte';

  const CENTER = Math.floor(GRID_SIZE / 2);

  /**
   * Generate land positions in concentric circles around center
   * Circle 0: Just center (1 land)
   * Circle 1: 8 neighbors around center (8 lands)
   * Circle 2: 16 lands in next ring (16 lands)
   * etc.
   */
  function generateCircleLandPositions(
    centerX: number,
    centerY: number,
    maxCircles: number,
  ): Array<{ x: number; y: number; circle: number }> {
    const positions = [];
    console.log('🔍 Generating circles with max_circles:', maxCircles);
    // Circle 0: Center position
    positions.push({ x: centerX, y: centerY, circle: 0 });

    // Generate positions for each circle
    for (let circle = 1; circle <= maxCircles; circle++) {
      // For each circle, generate positions at distance 'circle' from center
      for (let dx = -circle; dx <= circle; dx++) {
        for (let dy = -circle; dy <= circle; dy++) {
          // Only include positions that are exactly at circle distance (Manhattan or Chebyshev)
          const isOnCircleEdge =
            Math.max(Math.abs(dx), Math.abs(dy)) === circle;

          if (isOnCircleEdge) {
            const x = centerX + dx;
            const y = centerY + dy;

            // Only add if within grid bounds
            if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
              positions.push({ x, y, circle });
            }
          }
        }
      }
    }

    return positions;
  }
  let coinShaderMaterial: CoinHoverShaderMaterial | undefined = $state();
  let clock = new Clock();

  let billboarding = $derived(devsettings.billboarding);

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

  // Cache coin geometry for better initialization performance
  const coinGeometry = new PlaneGeometry(0.3, 0.3);

  let interactionPlanes: TInstancedMesh | undefined = $state();
  let artLayerMesh: TInstancedMesh | undefined = $state();

  onMount(() => {
    // Create only 9 interaction planes (center + 8 neighbors)
    interactionPlanes = new TInstancedMesh(planeGeometry, planeMaterial, 9);

    const tempObject = new Object3D();

    // Create interaction planes for center (127,127) and its 8 neighbors
    for (let x = 0; x <= GRID_SIZE; x++) {
      for (let y = 0; y <= GRID_SIZE; y++) {
        const index = y * GRID_SIZE + x;
        tempObject.position.set(y, 1 - 0.03, x);
        tempObject.rotation.x = -Math.PI / 2;
        tempObject.updateMatrix();
        interactionPlanes.setMatrixAt(index, tempObject.matrix);
      }
    }
    interactionPlanes.instanceMatrix.needsUpdate = true;

    // Create art layer mesh with same pattern as interaction planes
    artLayerMesh = new TInstancedMesh(
      planeGeometry,
      new MeshBasicMaterial({
        transparent: true,
        opacity: 0.5,
        alphaTest: 0.01,
      }),
      GRID_SIZE * GRID_SIZE,
    );
  });

  onMount(() => {
    landStore.getAllLands().subscribe((tiles) => {
      landTiles = tiles.map((tile) => {
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

  // Update art layer matrices when visible land tiles change
  $effect(() => {
    if (artLayerMesh && visibleLandTiles.length > 0) {
      const tempObject = new Object3D();

      visibleLandTiles.forEach((tile, index) => {
        tempObject.position.set(
          tile.position[0],
          tile.position[1] + 0.02, // Slightly above the tile
          tile.position[2],
        );
        tempObject.rotation.x = -Math.PI / 2;
        tempObject.updateMatrix();
        if (artLayerMesh) {
          artLayerMesh.setMatrixAt(index, tempObject.matrix);
          // Set color based on tile type
          const color = getArtLayerColor(tile);
          const threeColor = new Color(color);
          artLayerMesh.setColorAt(index, threeColor);
        }
      });

      artLayerMesh.instanceMatrix.needsUpdate = true;
      if (artLayerMesh.instanceColor) {
        artLayerMesh.instanceColor.needsUpdate = true;
      }
      artLayerMesh.count = visibleLandTiles.length;
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

  // Pre-calculated coin values based on zoom
  let coinPositionOffset = $derived<[number, number, number]>(
    isUnzoomed ? [0.2, 0, 0] : [0, 0, -0.5],
  );
  let coinScale = $derived(isUnzoomed ? 1.5 : 1);

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
      }
    }
  });

  let selectedLandTilePosition: [number, number, number] | undefined =
    $state(undefined);

  $effect(() => {
    if (
      cursorStore.selectedTileIndex !== undefined &&
      visibleLandTiles[cursorStore.selectedTileIndex]
    ) {
      const basePosition =
        visibleLandTiles[cursorStore.selectedTileIndex].position;
      selectedLandTilePosition = [
        basePosition[0],
        basePosition[1] + 0.1,
        basePosition[2],
      ];
    } else {
      selectedLandTilePosition = undefined;
    }
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

  // Filter to show tiles based on maxCircles configuration
  let visibleLandTiles = $derived.by(() => {
    const landPositions = generateCircleLandPositions(
      CENTER,
      CENTER,
      configValues.maxCircles,
    );
    const tiles: LandTile[] = [];

    // Find tiles for each calculated position in the same order as interaction planes
    landPositions.forEach((pos) => {
      const tile = landTiles.find(
        (tile) => tile.position[0] === pos.y && tile.position[2] === pos.x,
      );
      if (tile) {
        tiles.push(tile);
      }
    });

    console.log(
      `Rendering ${tiles.length} land tiles across ${configValues.maxCircles} circles`,
    );
    return tiles;
  });

  // Optimized coin tiles using ownership index for faster lookups
  let ownedCoinTiles = $derived.by(() => {
    if (!accountState.address || !visibleLandTiles) return [];

    // Get the ownership index for fast lookup
    const ownedIndices = store.getOwnedLandIndices(accountState.address);
    if (ownedIndices.length === 0) return [];

    // Create a Set for O(1) lookup performance
    const ownedIndicesSet = new Set(ownedIndices);

    // Filter tiles using the ownership index for better performance
    return visibleLandTiles.filter((tile) => {
      if (!BuildingLand.is(tile.land)) return false;

      // Calculate land index to check ownership
      const landIndex = tile.land.location.x * GRID_SIZE + tile.land.location.y;
      return ownedIndicesSet.has(landIndex);
    });
  });

  // Reactive owned lands for shader-based darkening (up to 32 lands)
  const maxOwnedLands = 32; // Match shader uniform array limit
  let ownedLandIndices = $state<number[]>([]);

  $effect(() => {
    if (!accountState.address) {
      ownedLandIndices = [];
      return;
    }

    // Get reactive store for current account
    const ownedLandIndicesStore = store.getOwnedLandIndicesStore(
      accountState.address,
      maxOwnedLands,
    );

    // Subscribe to changes in the ownership index
    const unsubscribe = ownedLandIndicesStore.subscribe((indices) => {
      ownedLandIndices = indices;
    });

    return () => unsubscribe();
  });

  // Art layer color mapping
  function getArtLayerColor(tile: LandTile): number {
    if (AuctionLand.is(tile.land)) {
      return 0xff6600; // Orange for auction
    }

    if (BuildingLand.is(tile.land)) {
      const tokenSymbol = tile.land.token?.symbol ?? 'empty';

      // Define colors for different tokens
      switch (tokenSymbol) {
        case 'pltSTRK':
        case 'STRK':
          return 0x1e40af; // Blue
        case 'pltLORDS':
        case 'LORDS':
          return 0x7c2d12; // Brown
        case 'pltETH':
        case 'ETH':
          return 0x374151; // Gray
        case 'pltPAPER':
        case 'PAPER':
          return 0xfbbf24; // Yellow
        case 'pltBROTHER':
        case 'BROTHER':
          return 0xdc2626; // Red
        case 'pltPAL':
        case 'PAL':
          return 0x059669; // Green
        default:
          return 0xfefefe; // White for empty/unknown
      }
    }

    // White for empty land
    return 0xfefefe;
  }
</script>

{#await Promise.all( [buildingAtlas.spritesheet, biomeAtlas.spritesheet, roadAtlas.spritesheet, nukeAtlas.spritesheet, fogAtlas.spritesheet, ownerAtlas.spritesheet], ) then [buildingSpritesheet, biomeSpritesheet, roadSpritesheet, nukeSpritesheet, fogSpritesheet, ownerSpritesheet]}
  <T is={Group}>
    <!-- Transparent interaction planes layer (now also renders roads) -->
    <!-- {#if interactionPlanes && devsettings.showRoads}
      <T
        is={interactionPlanes}
        interactive={true}
        onpointerenter={handlePlaneHover}
        onpointerleave={handlePlaneLeave}
        onclick={handleClickToSelectHovered}
      />
    {/if} -->

    <!-- Road sprites (middle layer) -->
    {#if devsettings.showRoads}
      <InstancedSprite
        count={GRID_SIZE * GRID_SIZE}
        {billboarding}
        spritesheet={roadSpritesheet}
        bind:ref={roadSprite}
      >
        <RoadSprite landTiles={visibleLandTiles} />
      </InstancedSprite>
    {/if}

    <!-- Biome sprites (background layer) -->
    {#if devsettings.showBiomes}
      <InstancedSprite
        count={GRID_SIZE * GRID_SIZE}
        {billboarding}
        spritesheet={biomeSpritesheet}
        bind:ref={biomeSprite}
      >
        <LandTileSprite
          landTiles={visibleLandTiles}
          spritesheet={biomeSpritesheet}
          animationProperty="biomeAnimationName"
          {ownedLandIndices}
          {isUnzoomed}
        />
      </InstancedSprite>
    {/if}

    <!-- FOG OF WAR LAYER -->
    <!-- {#if devsettings.showFog}
      <InstancedSprite
        count={visibleLandTiles.length}
        {billboarding}
        spritesheet={fogSpritesheet}
        fps={1}
      >
        <FogSprite landTiles={visibleLandTiles} />
      </InstancedSprite>
    {/if} -->

    <!-- Building sprites (foreground layer) -->
    {#if devsettings.showBuildings}
      <InstancedSprite
        count={GRID_SIZE * GRID_SIZE}
        {billboarding}
        spritesheet={buildingSpritesheet}
        bind:ref={buildingSprite}
      >
        <LandTileSprite
          landTiles={visibleLandTiles}
          spritesheet={buildingSpritesheet}
          animationProperty="buildingAnimationName"
          {ownedLandIndices}
          {isUnzoomed}
        />
      </InstancedSprite>
    {/if}

    {#if devsettings.showNukes}
      <InstancedSprite
        count={GRID_SIZE * GRID_SIZE}
        {billboarding}
        spritesheet={nukeSpritesheet}
        bind:ref={nukeSprite}
        fps={10}
      >
        <NukeSprite landTiles={visibleLandTiles} />
      </InstancedSprite>
    {/if}

    {#if devsettings.showCoins && coinShaderMaterial && ownedCoinTiles.length > 0}
      <InstancedMesh
        limit={GRID_SIZE * GRID_SIZE}
        range={GRID_SIZE * GRID_SIZE}
      >
        <T is={coinGeometry} />
        <T is={coinShaderMaterial} />
        {#each ownedCoinTiles as tile, i}
          <Coin
            {tile}
            {i}
            instancedMesh={coinInstancedMesh}
            positionOffset={coinPositionOffset}
            scale={coinScale}
            shaderMaterial={coinShaderMaterial}
          />
        {/each}
      </InstancedMesh>
    {/if}

    {#if devsettings.showOwnerIndicator && !isUnzoomed}
      <OwnerIndicator
        landTiles={visibleLandTiles}
        instancedMesh={ownerInstancedMesh}
      />
    {/if}

    {#if devsettings.showNukeTimes}
      <NukeTimeDisplay landTiles={visibleLandTiles} isShieldMode={isUnzoomed} />
    {/if}

    <!-- Art Layer -->
    {#if devsettings.showArtLayer && artLayerMesh}
      <T is={artLayerMesh} />
    {/if}

    <!-- Owned land darkening is now handled by the shader system -->
  </T>
{/await}

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
