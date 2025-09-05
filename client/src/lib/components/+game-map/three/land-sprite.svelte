<script lang="ts">
  import { AuctionLand } from '$lib/api/land/auction_land';
  import { BuildingLand } from '$lib/api/land/building_land';
  import accountState from '$lib/account.svelte';
  import { openLandInfoWidget } from '$lib/components/+game-ui/game-ui.svelte';
  import { Button } from '$lib/components/ui/button';
  import { landStore, selectedLandWithActions } from '$lib/stores/store.svelte';

  // Allow passing a custom land store (for tutorials)
  interface Props {
    store?: typeof landStore;
  }

  let { store = landStore }: Props = $props();
  import { T, useTask } from '@threlte/core';
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
    Color,
  } from 'three';
  import LandRatesOverlay from '../land/land-rates-overlay.svelte';
  import LandTileSprite from './land-tile-sprite.svelte';
  import { biomeAtlasMeta } from './biomes';
  import { buildingAtlasMeta } from './buildings';
  import Coin from './coin.svelte';
  import RoadSprite from './road-sprite.svelte';
  import { cursorStore } from './cursor.store.svelte';
  import { gameStore } from './game.store.svelte';
  import { LandTile } from './landTile';
  import NukeSprite from './nuke-sprite.svelte';
  import OwnerIndicator from './owner-indicator.svelte';
  import AuctionIndicator from './auction-indicator.svelte';
  import NukeTimeDisplay from './nuke-time-display.svelte';
  import { devsettings } from './utils/devsettings.store.svelte';
  import { CoinHoverShaderMaterial } from './utils/coin-hover-shader';
  import { Clock } from 'three';
  import { GRID_SIZE } from '$lib/const';
  import { configValues } from '$lib/stores/config.store.svelte';
  import Clouds from './clouds.svelte';
  import { loadingStore } from '$lib/stores/loading.store.svelte';

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

  let landTiles: LandTile[] = $state([]);

  // Calculate bounds of visible lands for clouds - now reactive to visible tiles
  let landBounds = $derived.by(() => {
    if (!visibleLandTiles || visibleLandTiles.length === 0) return null;

    // Calculate bounds from visible lands only
    let minX = GRID_SIZE,
      maxX = -1;
    let minY = GRID_SIZE,
      maxY = -1;

    visibleLandTiles.forEach((tile) => {
      if (BuildingLand.is(tile.land) || AuctionLand.is(tile.land)) {
        const x = tile.land.location.x;
        const y = tile.land.location.y;

        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    });

    // Return null if no valid bounds found
    if (minX > maxX || minY > maxY) {
      return null;
    }

    return { minX, maxX, minY, maxY };
  });

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
  let artLayerMesh: TInstancedMesh | undefined = $state();

  onMount(() => {
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

  // Reactive values for hover and selected tile indices based on grid position
  let hoveredTileIndex = $derived.by(() => {
    if (!cursorStore.gridPosition) return undefined;

    // Find the tile index in visibleLandTiles that matches the grid position
    return visibleLandTiles.findIndex(
      (tile) =>
        tile.position[0] === cursorStore.gridPosition!.x && // position[0] is gridX
        tile.position[2] === cursorStore.gridPosition!.y, // position[2] is gridY
    );
  });

  // Update cursor store with the correct hover index for other components
  $effect(() => {
    cursorStore.hoveredTileIndex =
      hoveredTileIndex !== -1 ? hoveredTileIndex : undefined;
  });

  // Derive selected tile index from cursor store
  let selectedTileIndex = $derived(cursorStore.selectedTileIndex);

  $effect(() => {
    if (
      selectedTileIndex !== undefined &&
      visibleLandTiles[selectedTileIndex]
    ) {
      const basePosition = visibleLandTiles[selectedTileIndex].position;
      selectedLandTilePosition = [
        basePosition[0],
        basePosition[1] + 0.1,
        basePosition[2],
      ];
    } else {
      selectedLandTilePosition = undefined;
    }
  });

  // Load coin texture and setup shader material
  new TextureLoader().load('/ui/icons/Icon_Coin2.png', (loadedTexture) => {
    loadedTexture.magFilter = NearestFilter;
    loadedTexture.minFilter = NearestFilter;
    coinShaderMaterial = new CoinHoverShaderMaterial(loadedTexture);
  });

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
  let auctionInstancedMesh: TInstancedMesh | undefined = $state();
  let coinInstancedMesh: TInstancedMesh | undefined = $state();

  // Memoized circle positions cache
  let circlePositionsCache = new Map<
    string,
    Array<{ x: number; y: number; circle: number }>
  >();

  // Land tiles lookup map for O(1) access
  let landTilesMap = $state(new Map<string, LandTile>());

  // Update lookup map when landTiles change
  $effect(() => {
    const newMap = new Map<string, LandTile>();
    landTiles.forEach((tile) => {
      const key = `${tile.position[0]},${tile.position[2]}`;
      newMap.set(key, tile);
    });
    landTilesMap = newMap;
  });

  // Optimized visible land calculation with memoization
  let visibleLandTiles = $derived.by(() => {
    // const maxCirc = configValues.maxCircles;
    const maxCirc = 256;

    // Check cache for circle positions
    const cacheKey = `${CENTER},${CENTER},${maxCirc}`;
    let landPositions = circlePositionsCache.get(cacheKey);

    if (!landPositions) {
      landPositions = generateCircleLandPositions(CENTER, CENTER, maxCirc);
      circlePositionsCache.set(cacheKey, landPositions);
    }

    const tiles: LandTile[] = [];

    // Use O(1) map lookup instead of O(n) array.find()
    landPositions.forEach((pos) => {
      const key = `${pos.y},${pos.x}`;
      const tile = landTilesMap.get(key);
      if (tile) {
        tiles.push(tile);
      }
    });

    console.log(
      `Rendering ${tiles.length} land tiles across ${maxCirc} circles`,
    );
    return tiles;
  });

  // Cache ownership data to avoid repeated store calls
  let ownershipCache = $state<{
    address: string | null;
    ownedIndicesSet: Set<number>;
    lastUpdate: number;
  }>({
    address: null,
    ownedIndicesSet: new Set(),
    lastUpdate: 0,
  });

  // Update ownership cache when address changes
  $effect(() => {
    const currentAddress = accountState.address ?? null;
    if (currentAddress !== ownershipCache.address) {
      const ownedIndices = accountState.address
        ? store.getOwnedLandIndices(accountState.address)
        : [];
      ownershipCache = {
        address: currentAddress,
        ownedIndicesSet: new Set(ownedIndices),
        lastUpdate: Date.now(),
      };
    }
  });

  // Optimized coin tiles using cached ownership data
  let ownedCoinTiles = $derived.by(() => {
    if (
      !ownershipCache.address ||
      !visibleLandTiles ||
      ownershipCache.ownedIndicesSet.size === 0
    )
      return [];

    return visibleLandTiles.filter((tile) => {
      if (!BuildingLand.is(tile.land)) return false;
      const landIndex = tile.land.location.x * GRID_SIZE + tile.land.location.y;
      return ownershipCache.ownedIndicesSet.has(landIndex);
    });
  });

  // Optimized owned land indices calculation
  let ownedLandIndices = $derived.by(() => {
    if (
      !ownershipCache.address ||
      !visibleLandTiles ||
      ownershipCache.ownedIndicesSet.size === 0
    )
      return [];

    const ownedVisibleIndices: number[] = [];
    visibleLandTiles.forEach((tile, index) => {
      if (BuildingLand.is(tile.land)) {
        const landIndex =
          tile.land.location.x * GRID_SIZE + tile.land.location.y;
        if (ownershipCache.ownedIndicesSet.has(landIndex)) {
          ownedVisibleIndices.push(index);
        }
      }
    });

    return ownedVisibleIndices;
  });

  // Optimized auction land indices calculation
  let auctionLandIndices = $derived.by(() => {
    if (!visibleLandTiles) return [];

    const auctionVisibleIndices: number[] = [];
    visibleLandTiles.forEach((tile, index) => {
      if (AuctionLand.is(tile.land)) {
        auctionVisibleIndices.push(index);
      }
    });

    return auctionVisibleIndices;
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

{#await loadingStore.getAllSpritesheets() then [buildingSpritesheet, biomeSpritesheet, roadSpritesheet, nukeSpritesheet, fogSpritesheet, ownerSpritesheet]}
  <T is={Group} receiveShadow={true}>
    <!-- Road sprites (middle layer) -->
    {#if devsettings.showRoads}
      <InstancedSprite
        count={visibleLandTiles.length}
        {billboarding}
        spritesheet={roadSpritesheet}
        bind:ref={roadSprite}
        receiveShadow={true}
      >
        <RoadSprite landTiles={visibleLandTiles} />
      </InstancedSprite>
    {/if}

    <!-- Biome sprites (background layer) -->
    {#if devsettings.showBiomes}
      <InstancedSprite
        count={visibleLandTiles.length}
        {billboarding}
        spritesheet={biomeSpritesheet}
        bind:ref={biomeSprite}
        receiveShadow={true}
      >
        <LandTileSprite
          landTiles={visibleLandTiles}
          spritesheet={biomeSpritesheet}
          animationProperty="biomeAnimationName"
          {ownedLandIndices}
          {auctionLandIndices}
          {isUnzoomed}
        />
      </InstancedSprite>
    {/if}

    <!-- Building sprites (foreground layer) -->
    {#if devsettings.showBuildings}
      <InstancedSprite
        count={visibleLandTiles.length}
        {billboarding}
        spritesheet={buildingSpritesheet}
        bind:ref={buildingSprite}
        receiveShadow={true}
      >
        <LandTileSprite
          landTiles={visibleLandTiles}
          spritesheet={buildingSpritesheet}
          animationProperty="buildingAnimationName"
          {ownedLandIndices}
          {auctionLandIndices}
          {isUnzoomed}
        />
      </InstancedSprite>
    {/if}

    {#if devsettings.showNukes}
      <InstancedSprite
        count={visibleLandTiles.length}
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
        {store}
      />
    {/if}

    {#if isUnzoomed}
      <AuctionIndicator
        landTiles={visibleLandTiles}
        instancedMesh={auctionInstancedMesh}
      />
    {/if}

    {#if devsettings.showNukeTimes}
      <NukeTimeDisplay landTiles={visibleLandTiles} isShieldMode={isUnzoomed} />
    {/if}

    <!-- Art Layer -->
    {#if devsettings.showArtLayer && artLayerMesh}
      <T is={artLayerMesh} />
    {/if}

    <!-- Clouds positioned at land bounds -->
    {#if devsettings.showClouds}
      <Clouds bounds={landBounds} />
    {/if}
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
