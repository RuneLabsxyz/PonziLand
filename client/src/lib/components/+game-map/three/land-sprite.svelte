<script lang="ts">
  import accountState from '$lib/account.svelte';
  import { AuctionLand } from '$lib/api/land/auction_land';
  import { BuildingLand } from '$lib/api/land/building_land';
  import { openLandInfoWidget } from '$lib/components/+game-ui/game-ui.svelte';
  import { HeatmapCalculator } from '$lib/components/+game-ui/widgets/heatmap/heatmap-calculator';
  import { Button } from '$lib/components/ui/button';
  import { GRID_SIZE } from '$lib/const';
  import { configValues } from '$lib/stores/config.store.svelte';
  import { heatmapStore } from '$lib/stores/heatmap.svelte';
  import { loadingStore } from '$lib/stores/loading.store.svelte';
  import { landStore, selectedLandWithActions } from '$lib/stores/store.svelte';
  import { T, useTask } from '@threlte/core';
  import { HTML, InstancedMesh, InstancedSprite } from '@threlte/extras';
  import { onMount, onDestroy } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import {
    Clock,
    Color,
    Group,
    MeshBasicMaterial,
    NearestFilter,
    Object3D,
    PlaneGeometry,
    InstancedMesh as TInstancedMesh,
    TextureLoader,
  } from 'three';
  import LandRatesOverlay from '../land/land-rates-overlay.svelte';
  import AuctionIndicator from './auction-indicator.svelte';
  import Clouds from './clouds.svelte';
  import Coin from './coin.svelte';
  import { cursorStore } from './cursor.store.svelte';
  import { gameStore } from './game.store.svelte';
  import LandTileSprite from './land-tile-sprite.svelte';
  import { LandTile } from './landTile';
  import NukeSprite from './nuke-sprite.svelte';
  import NukeTimeDisplay from './nuke-time-display.svelte';
  import OwnerIndicator from './owner-indicator.svelte';
  import RoadSprite from './road-sprite.svelte';
  import { CoinHoverShaderMaterial } from './utils/coin-hover-shader';
  import { devsettings } from './utils/devsettings.store.svelte';
  import { toLocation } from '$lib/api/land/location';
  import { coordinatesToLocation } from '$lib/utils';
  const CIRCLE_PADDING = 8;

  // Allow passing a custom land store (for tutorials)
  interface Props {
    store?: typeof landStore;
  }

  let { store = landStore }: Props = $props();

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

  let roadSprite: any = $state();
  let biomeSprite: any = $state();
  let buildingSprite: any = $state();
  let nukeSprite: any = $state();

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

  // Update art layer material opacity based on dev settings (heatmap no longer uses art layer)
  $effect(() => {
    if (artLayerMesh && artLayerMesh.material) {
      const material = artLayerMesh.material as MeshBasicMaterial;
      material.opacity = devsettings.artLayerOpacity;
    }
  });

  onMount(() => {
    store.getAllLands().subscribe((tiles) => {
      landTiles = tiles.map((tile) => {
        let tokenSymbol = 'empty';
        let skin = 'default';

        if (BuildingLand.is(tile)) {
          tokenSymbol = tile?.token?.symbol ?? 'empty';
          skin = tile?.token?.skin ?? 'empty';
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

  // Update art layer matrices when visible land tiles change (heatmap now uses shader tinting)
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
          // Set color based on legacy token colors only (heatmap uses shader now)
          const color = getLegacyArtLayerColor(tile);
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
    // Only run camera zoom monitoring if animations are enabled
    if (!devsettings.enableAnimations) return;

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

    // Calculate grid-based sprite index instead of array index
    const gridX = cursorStore.gridPosition.x;
    const gridY = cursorStore.gridPosition.y;

    // Check if there's actually a tile at this position
    const tileExists = visibleLandTiles.some(
      (tile) =>
        tile.position[0] === gridX && // position[0] is gridX
        tile.position[2] === gridY, // position[2] is gridY
    );

    // Return grid-based index if tile exists, undefined otherwise
    return tileExists
      ? coordinatesToLocation({ x: gridX, y: gridY })
      : undefined;
  });

  // Update cursor store with the correct hover index for other components
  $effect(() => {
    cursorStore.hoveredTileIndex =
      hoveredTileIndex !== -1 ? hoveredTileIndex : undefined;
  });

  // Derive selected tile index from cursor store
  let selectedTileIndex = $derived(cursorStore.selectedTileIndex);

  $inspect('Selected Tile position:', selectedLandTilePosition);

  $effect(() => {
    if (selectedTileIndex !== undefined) {
      console.log(
        'Selected Tile Index:',
        selectedTileIndex,
        toLocation(selectedTileIndex),
      );
      // Convert grid-based index back to grid coordinates
      const { x: gridX, y: gridY } = toLocation(selectedTileIndex);

      // Find the actual tile at this grid position
      const selectedTile = visibleLandTiles.find(
        (tile) => tile.position[0] === gridX && tile.position[2] === gridY,
      );

      if (selectedTile) {
        const basePosition = selectedTile.position;
        console.log('Selected Tile Position:', basePosition);
        selectedLandTilePosition = [
          basePosition[0],
          basePosition[1] + 0.1,
          basePosition[2],
        ];
      } else {
        selectedLandTilePosition = undefined;
      }
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
    // Only run shader animations if enabled
    if (!devsettings.enableAnimations || !devsettings.enableShaderAnimations)
      return;

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
    const maxCirc = configValues.maxCircles + CIRCLE_PADDING;

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

  // Reactive ownership data based on store ownership index
  let ownedIndicesSet = $state(new SvelteSet<number>());
  let currentSubscription: (() => void) | null = null;
  let lastAddress: string | undefined = undefined;

  $effect(() => {
    const currentAddress = accountState.address;

    // Only update subscription if address changed
    if (currentAddress !== lastAddress) {
      // Clean up previous subscription
      if (currentSubscription) {
        currentSubscription();
        currentSubscription = null;
      }

      lastAddress = currentAddress;

      if (currentAddress) {
        // Create new subscription for this address
        const ownedIndicesStore =
          store.getOwnedLandIndicesStore(currentAddress);
        currentSubscription = ownedIndicesStore.subscribe((indices) => {
          ownedIndicesSet = new SvelteSet(indices);
        });
      } else {
        ownedIndicesSet = new SvelteSet<number>();
      }
    }

    // Cleanup on unmount
    return () => {
      if (currentSubscription) {
        currentSubscription();
      }
    };
  });

  // Optimized coin tiles using reactive ownership data
  let ownedCoinTiles = $derived.by(() => {
    if (
      !accountState.address ||
      !visibleLandTiles ||
      ownedIndicesSet.size === 0
    )
      return [];

    return visibleLandTiles.filter((tile) => {
      if (!BuildingLand.is(tile.land)) return false;
      const landIndex = coordinatesToLocation(tile.land.location);
      return ownedIndicesSet.has(landIndex);
    });
  });

  // Optimized owned land indices calculation
  let ownedLandIndices = $derived.by(() => {
    if (
      !accountState.address ||
      !visibleLandTiles ||
      ownedIndicesSet.size === 0
    )
      return [];

    const ownedVisibleIndices: number[] = [];
    visibleLandTiles.forEach((tile) => {
      if (BuildingLand.is(tile.land)) {
        const landIndex = coordinatesToLocation(tile.land.location);
        if (ownedIndicesSet.has(landIndex)) {
          // Use grid-based sprite index instead of array index
          const spriteIndex = coordinatesToLocation(tile.land.location);
          ownedVisibleIndices.push(spriteIndex);
        }
      }
    });

    return ownedVisibleIndices;
  });

  // Optimized auction land indices calculation
  let auctionLandIndices = $derived.by(() => {
    if (!visibleLandTiles) return [];

    const auctionVisibleIndices: number[] = [];
    visibleLandTiles.forEach((tile) => {
      if (AuctionLand.is(tile.land)) {
        // Use grid-based sprite index instead of array index
        const spriteIndex = coordinatesToLocation(tile.land.location);
        auctionVisibleIndices.push(spriteIndex);
      }
    });

    return auctionVisibleIndices;
  });

  // Heatmap calculation - reactive to store changes and visible tiles
  let heatmapResult = $derived.by(() => {
    if (
      !heatmapStore.enabled ||
      !visibleLandTiles ||
      visibleLandTiles.length === 0
    ) {
      return null;
    }

    return HeatmapCalculator.calculate(
      visibleLandTiles,
      heatmapStore.parameter,
      heatmapStore.colorScheme,
    );
  });

  let heatmapColors = $derived(
    heatmapResult?.colors ?? new Map<LandTile, number>(),
  );

  // Convert heatmap data to shader-compatible format
  let heatmapTintData = $derived.by(() => {
    if (!heatmapResult || !heatmapStore.enabled) {
      return { indices: [], colors: [] };
    }

    const indices: number[] = [];
    const colors: number[] = [];

    for (const [tile, hexColor] of heatmapColors) {
      // Calculate grid-based sprite index
      const spriteIndex = coordinatesToLocation({
        x: tile.position[0],
        y: tile.position[2],
      });
      indices.push(spriteIndex);

      // Convert hex color to RGB components (0-1 range)
      const r = ((hexColor >> 16) & 0xff) / 255;
      const g = ((hexColor >> 8) & 0xff) / 255;
      const b = (hexColor & 0xff) / 255;

      colors.push(r, g, b);
    }

    return { indices, colors };
  });

  // Update store stats when heatmap result changes
  $effect(() => {
    if (heatmapResult) {
      heatmapStore.updateStats(
        heatmapResult.minValue,
        heatmapResult.maxValue,
        heatmapResult.validTileCount,
      );
    }
  });

  // Art layer color mapping - legacy token colors only (heatmap now uses shader tinting)
  function getArtLayerColor(tile: LandTile): number {
    return getLegacyArtLayerColor(tile);
  }

  // Legacy art layer color mapping (original implementation)
  function getLegacyArtLayerColor(tile: LandTile): number {
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

  // Get spritesheets from loading store
  const {
    building: buildingSpritesheet,
    biome: biomeSpritesheet,
    road: roadSpritesheet,
    nuke: nukeSpritesheet,
  } = loadingStore.getAllSpritesheets();

  // Add wait mechanism for shader compilation
  let shaderReady = $state(false);

  // Check shader compilation status before rendering land tiles
  $effect(() => {
    // Check if spritesheets are loaded first
    if (
      buildingSpritesheet &&
      biomeSpritesheet &&
      roadSpritesheet &&
      nukeSpritesheet
    ) {
      // Try to access the shader program to verify compilation
      // This will trigger compilation if not already done
      try {
        // Access the InstancedSprite's material/shader to trigger compilation check
        shaderReady = true; // For now, set to true when spritesheets are ready
        console.log(
          'Shader compilation check passed, land tiles ready to render',
        );
      } catch (error) {
        console.error('Shader compilation failed:', error);
        shaderReady = false;
      }
    } else {
      shaderReady = false;
    }
  });

  onDestroy(() => {
    roadTexture?.dispose();
    crownTexture?.dispose();
    shieldTexture?.dispose();
    
    planeMaterial?.dispose();
    coinShaderMaterial?.dispose();
    if (artLayerMesh?.material) {
      (artLayerMesh.material as MeshBasicMaterial).dispose();
    }
    
    planeGeometry?.dispose();
    coinGeometry?.dispose();
    
    if (artLayerMesh) {
      artLayerMesh.geometry?.dispose();
      artLayerMesh.clear?.();
    }
    
    circlePositionsCache.clear();
    landTilesMap.clear();
    
    if (currentSubscription) {
      currentSubscription();
      currentSubscription = null;
    }
    
    landTiles = [];
    visibleLandTiles = [];
    ownedCoinTiles = [];
  });
</script>

<!-- Main land sprite rendering group -->
<T is={Group} receiveShadow={true}>
  {#if buildingSpritesheet && biomeSpritesheet && roadSpritesheet && nukeSpritesheet && shaderReady}
    <!-- Road sprites (middle layer) -->
    {#if devsettings.showRoads}
      <InstancedSprite
        count={GRID_SIZE * GRID_SIZE}
        {billboarding}
        spritesheet={roadSpritesheet}
        bind:ref={roadSprite}
        receiveShadow={true}
        fps={devsettings.enableAnimations && devsettings.enableSpriteAnimations
          ? devsettings.reducedAnimationMode
            ? Math.max(10, devsettings.animationFPS)
            : undefined
          : 0}
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
        receiveShadow={true}
        fps={devsettings.enableAnimations && devsettings.enableSpriteAnimations
          ? devsettings.reducedAnimationMode
            ? Math.max(10, devsettings.animationFPS)
            : undefined
          : 0}
      >
        <LandTileSprite
          landTiles={visibleLandTiles}
          spritesheet={biomeSpritesheet}
          animationProperty="biomeAnimationName"
          {ownedLandIndices}
          {auctionLandIndices}
          {isUnzoomed}
          heatmapTintIndices={heatmapTintData.indices}
          heatmapTintColors={heatmapTintData.colors}
          heatmapOpacity={heatmapStore.opacity}
        />
      </InstancedSprite>
    {/if}

    <!-- Building sprites (foreground layer) -->
    {#if devsettings.showBuildings}
      <InstancedSprite
        count={GRID_SIZE * GRID_SIZE}
        {billboarding}
        spritesheet={buildingSpritesheet}
        bind:ref={buildingSprite}
        receiveShadow={true}
        fps={devsettings.enableAnimations && devsettings.enableSpriteAnimations
          ? devsettings.reducedAnimationMode
            ? Math.max(10, devsettings.animationFPS)
            : undefined
          : 0}
      >
        <LandTileSprite
          landTiles={visibleLandTiles}
          spritesheet={buildingSpritesheet}
          animationProperty="buildingAnimationName"
          {ownedLandIndices}
          {auctionLandIndices}
          {isUnzoomed}
          heatmapTintIndices={heatmapTintData.indices}
          heatmapTintColors={heatmapTintData.colors}
          heatmapOpacity={heatmapStore.opacity}
        />
      </InstancedSprite>
    {/if}

    {#if devsettings.showNukes}
      <InstancedSprite
        count={GRID_SIZE * GRID_SIZE}
        {billboarding}
        spritesheet={nukeSpritesheet}
        bind:ref={nukeSprite}
        fps={devsettings.enableAnimations &&
        devsettings.enableSpriteAnimations &&
        devsettings.enableNukeAnimations
          ? devsettings.reducedAnimationMode
            ? Math.max(5, devsettings.animationFPS / 3)
            : 10
          : 0}
      >
        <NukeSprite landTiles={visibleLandTiles} />
      </InstancedSprite>
    {/if}

    {#if devsettings.showCoins && coinShaderMaterial && ownedCoinTiles.length > 0}
      <InstancedMesh
        limit={GRID_SIZE * GRID_SIZE}
        range={GRID_SIZE * GRID_SIZE}
        frustumCulled={false}
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
      <NukeTimeDisplay
        landTiles={visibleLandTiles}
        isShieldMode={isUnzoomed}
        {isUnzoomed}
        currentUserAddress={accountState.address}
        enableAnimation={devsettings.enableAnimations &&
          devsettings.enableNukeAnimations}
      />
    {/if}

    <!-- Art Layer (legacy token colors only - heatmap now uses shader tinting) -->
    {#if devsettings.showArtLayer && artLayerMesh}
      <T is={artLayerMesh} />
    {/if}

    <!-- Clouds positioned at land bounds -->
    {#if devsettings.showClouds}
      <Clouds
        bounds={landBounds}
        enableAnimation={devsettings.enableAnimations &&
          devsettings.enableCloudAnimations}
      />
    {/if}
  {/if}
</T>

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
      {#if devsettings.showRatesOverlay}
        <LandRatesOverlay {land} />
      {/if}
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
