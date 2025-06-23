<script lang="ts">
  import { AuctionLand } from '$lib/api/land/auction_land';
  import { BuildingLand } from '$lib/api/land/building_land';
  import {
    landStore,
    selectedLand,
    selectedLandWithActions,
  } from '$lib/stores/store.svelte';
  import { T } from '@threlte/core';
  import {
    InstancedSprite,
    buildSpritesheet,
    type SpritesheetMetadata,
  } from '@threlte/extras';
  // Import the HTML component from @threlte/extras
  import { Button } from '$lib/components/ui/button';
  import { HTML } from '@threlte/extras';
  import { onMount } from 'svelte';
  import {
    Group,
    InstancedMesh,
    MeshBasicMaterial,
    Object3D,
    PlaneGeometry,
  } from 'three';
  import BuildingSprite from './building-sprite.svelte';
  import { buildingAtlasMeta } from './buildings';
  import { cursorStore } from './cursor.store.svelte';
  import { LandTile } from './landTile';
  import LandRatesOverlay from '../land/land-rates-overlay.svelte';

  let { billboarding = true } = $props();

  // Generate grid positions and create LandTile instances
  const gridSize = 64;

  const buildingAtlas =
    buildSpritesheet.from<typeof buildingAtlasMeta>(buildingAtlasMeta);

  // BIOME
  const biomeAtlasMeta = [
    {
      url: '/tokens/+global/biomes.png',
      type: 'rowColumn',
      width: 4,
      height: 5,
      animations: [
        { name: 'slinky', frameRange: [0, 0] },
        { name: 'auction', frameRange: [1, 1] },
        { name: 'pimp', frameRange: [2, 2] },
        { name: 'dope', frameRange: [3, 3] },
        { name: 'ekubo', frameRange: [4, 4] },
        { name: 'eth', frameRange: [5, 5] },
        { name: 'flip', frameRange: [6, 6] },
        { name: 'lords', frameRange: [7, 7] },
        { name: 'eLORDS', frameRange: [7, 7] },
        { name: 'nftLORDS', frameRange: [7, 7] },
        { name: 'nums', frameRange: [8, 8] },
        { name: 'pal', frameRange: [9, 9] },
        { name: 'circus', frameRange: [10, 10] },
        { name: 'sisters', frameRange: [11, 11] },
        { name: 'btc', frameRange: [12, 12] },
        { name: 'brother', frameRange: [13, 13] },
        { name: 'strk', frameRange: [14, 14] },
        { name: 'nftSTRK', frameRange: [14, 14] },
        { name: 'wnt', frameRange: [15, 15] },
        { name: 'eWNT', frameRange: [15, 15] },
        { name: 'qq', frameRange: [16, 16] },
        { name: 'eQQ', frameRange: [16, 16] },
        { name: 'evreai', frameRange: [17, 17] },
        { name: 'eSG', frameRange: [17, 17] },
      ],
    },
    {
      url: '/land-display/empty.png',
      type: 'rowColumn',
      width: 4,
      height: 3,
      animations: [
        { name: 'empty', frameRange: [0, 0] },
        { name: 'empty_0', frameRange: [0, 0] },
        { name: 'empty_1', frameRange: [1, 1] },
        { name: 'empty_2', frameRange: [2, 2] },
        { name: 'empty_3', frameRange: [3, 3] },
        { name: 'empty_4', frameRange: [4, 4] },
        { name: 'empty_5', frameRange: [5, 5] },
        { name: 'empty_6', frameRange: [6, 6] },
        { name: 'empty_7', frameRange: [7, 7] },
        { name: 'empty_8', frameRange: [8, 8] },
        { name: 'empty_9', frameRange: [9, 9] },
        { name: 'empty_10', frameRange: [10, 10] },
        { name: 'auction_shadow', frameRange: [11, 11] },
      ],
    },
  ] as const satisfies SpritesheetMetadata;
  const biomeAtlas =
    buildSpritesheet.from<typeof biomeAtlasMeta>(biomeAtlasMeta);

  // ROAD
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

  function getBiomeAnimationOrFallback(
    tile: LandTile,
    availableAnimations: string[],
  ): string {
    const derivedName = tile.getBiomeAnimationName();

    if (availableAnimations.includes(derivedName)) {
      return derivedName;
    }

    return 'empty';
  }

  const biomeAnimations = biomeAtlasMeta[0].animations.map((anim) => anim.name);

  let landTiles: any[] = $state([]);

  // Create transparent interaction planes
  const planeGeometry = new PlaneGeometry(1, 1);
  const planeMaterial = new MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    alphaTest: 0.1, // This ensures the planes are still raycastable even when transparent
  });

  onMount(() => {
    // Initialize land tiles from store
    landStore.getAllLands().subscribe((tiles) => {
      landTiles = tiles.map((tile, index) => {
        let tokenSymbol = 'empty';

        if (BuildingLand.is(tile)) {
          tokenSymbol = tile?.token?.symbol ?? 'empty';
        }

        if (AuctionLand.is(tile)) {
          tokenSymbol = 'auction';
        }

        // Calculate grid position based on index (left to right, top to bottom)
        const gridX = index % gridSize;
        const gridY = Math.floor(index / gridSize);

        return new LandTile([gridX, 1, gridY], tokenSymbol, tile.level);
      });

      // Setup interaction planes after landTiles are ready
      setupInteractionPlanes();
    });
  });

  let interactionPlanes: InstancedMesh | undefined = $state();

  function setupInteractionPlanes() {
    if (!landTiles.length) return;

    // Create instanced mesh for interaction planes
    interactionPlanes = new InstancedMesh(
      planeGeometry,
      planeMaterial,
      landTiles.length,
    );

    const tempObject = new Object3D();

    landTiles.forEach((tile, index) => {
      // Calculate grid position based on index (left to right, top to bottom)
      const gridX = index % gridSize;
      const gridY = Math.floor(index / gridSize);

      tempObject.position.set(gridX, 1.1, gridY); // Use grid coordinates, not tile.position
      tempObject.rotation.x = -Math.PI / 2; // Rotate to be horizontal
      tempObject.updateMatrix();
      if (interactionPlanes) {
        interactionPlanes.setMatrixAt(index, tempObject.matrix);
      }
    });

    interactionPlanes.instanceMatrix.needsUpdate = true;
  }

  $effect(() => {
    // Update sprite instances when landTiles or other relevant data changes
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

  // Handle plane interactions
  function handlePlaneHover(event: any) {
    const instanceId = event.instanceId;
    if (instanceId !== undefined && landTiles[instanceId]) {
      const tile = landTiles[instanceId];
      cursorStore.hoveredTileIndex = instanceId; // Set the hovered tile index
      console.log('Hovered plane coordinates:', {
        gridX: tile.position[0],
        gridY: tile.position[2], // Using Z as Y for 2D grid coordinates
        landId: tile.landId, // Original land ID
        instanceId: instanceId,
        tile: tile,
      });
    }
  }

  function handlePlaneLeave() {
    cursorStore.hoveredTileIndex = null; // Clear the hovered tile index
    console.log('Left plane');
  }

  function handlePlaneClick(event: any) {
    const instanceId = event.instanceId;
    if (instanceId !== undefined && landTiles[instanceId]) {
      const tile = landTiles[instanceId];
      cursorStore.selectedTileIndex = instanceId;
      console.log('Clicked plane coordinates:', {
        gridX: tile.position[0],
        gridY: tile.position[2], // Using Z as Y for 2D grid coordinates
        instanceId: instanceId,
        tile: tile,
      });
    }
  }

  // Function to get scale based on hover state
  function getTileScale(tileIndex: number): [number, number] {
    return cursorStore.hoveredTileIndex === tileIndex ||
      cursorStore.selectedTileIndex === tileIndex
      ? [1.2, 1.2]
      : [1.0, 1.0];
  }

  let selectedLandTilePosition: [number, number, number] | undefined =
    $state(undefined);

  $effect(() => {
    if (
      cursorStore.selectedTileIndex !== null &&
      landTiles[cursorStore.selectedTileIndex]
    ) {
      // The HTML component automatically handles perspective, so you might want to adjust the Y-position
      // to lift the button slightly above the tile visually.
      const basePosition = landTiles[cursorStore.selectedTileIndex].position;
      selectedLandTilePosition = [
        basePosition[0],
        basePosition[1] + 0.1, // Adjust Y to lift the button above the tile
        basePosition[2],
      ];
    } else {
      selectedLandTilePosition = undefined;
    }
  });
</script>

<T is={Group}>
  {#await Promise.all( [buildingAtlas.spritesheet, biomeAtlas.spritesheet, roadAtlas.spritesheet], ) then [buildingSpritesheet, resolvedBiomeSpritesheet, roadSpritesheet]}
    <!-- Transparent interaction planes layer (topmost for interactions) -->
    {#if interactionPlanes}
      <T
        is={interactionPlanes}
        interactive={true}
        onpointerenter={handlePlaneHover}
        onpointerleave={handlePlaneLeave}
        onclick={handlePlaneClick}
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
      {#snippet children({ Instance }: { Instance: any })}
        {#each landTiles as tile, i}
          <Instance
            animationName={'default'}
            position={[
              tile.position[0],
              tile.position[1] - 0.02,
              tile.position[2],
            ]}
            id={i}
          />
        {/each}
      {/snippet}
    </InstancedSprite>

    <!-- Biome sprites (background layer) -->
    <InstancedSprite
      count={gridSize * gridSize}
      {billboarding}
      spritesheet={resolvedBiomeSpritesheet}
      bind:ref={biomeSprite}
    >
      {#snippet children({ Instance: BiomeInstance }: { Instance: any })}
        {#each landTiles as tile, i}
          <BiomeInstance
            animationName={getBiomeAnimationOrFallback(tile, biomeAnimations)}
            position={[
              tile.position[0],
              tile.position[1] - 0.01,
              tile.position[2],
            ]}
            id={i}
          />
        {/each}
      {/snippet}
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

    <!-- Button overlay using Threlte HTML component -->
    {#if selectedLandTilePosition}
      <HTML
        position={selectedLandTilePosition}
        center={true}
        distanceFactor={0.01}
      >
        <div class="w-[100px] h-[100px] relative">
          <Button
            class="absolute bottom-0 left-1/2 -translate-x-1/2 "
            size="sm"
          >
            BUY LAND
          </Button>
        </div>
      </HTML>
    {/if}
  {/await}
</T>
