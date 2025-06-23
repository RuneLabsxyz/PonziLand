<script lang="ts">
  import { AuctionLand } from '$lib/api/land/auction_land';
  import { BuildingLand } from '$lib/api/land/building_land';
  import { Button } from '$lib/components/ui/button';
  import { landStore } from '$lib/stores/store.svelte';
  import { T } from '@threlte/core';
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
  import { biomeAtlasMeta } from './biomes';
  import BuildingSprite from './building-sprite.svelte';
  import { buildingAtlasMeta } from './buildings';
  import { cursorStore } from './cursor.store.svelte';
  import { LandTile } from './landTile';

  let { billboarding = true } = $props();

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

  function getBiomeAnimationOrFallback(
    tile: LandTile,
    availableAnimations: string[],
    tileIndex?: number,
  ): string {
    const derivedName = tile.getBiomeAnimationName();

    let name = 'empty';

    if (availableAnimations.includes(derivedName)) {
      name = derivedName;
    }

    // if hovered or selected, use the derived name
    if (
      cursorStore.hoveredTileIndex === tileIndex ||
      cursorStore.selectedTileIndex === tileIndex
    ) {
      if (availableAnimations.includes(derivedName + '-outline')) {
        name = derivedName + '-outline';
      }
    }
    return name;
  }

  const biomeAnimations = biomeAtlasMeta.flatMap((item) =>
    item.animations.map((anim) => anim.name),
  );

  let landTiles: any[] = $state([]);

  const planeGeometry = new PlaneGeometry(1, 1);
  const planeMaterial = new MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    alphaTest: 0.1,
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

        const gridX = index % gridSize;
        const gridY = Math.floor(index / gridSize);

        return new LandTile([gridX, 1, gridY], tokenSymbol, tile.level);
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
      const gridX = index % gridSize;
      const gridY = Math.floor(index / gridSize);

      tempObject.position.set(gridX, 1.1, gridY);
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

  // Function to be called by the global click listener
  function handleClickToSelectHovered() {
    if (cursorStore.hoveredTileIndex !== null) {
      cursorStore.selectedTileIndex = cursorStore.hoveredTileIndex;
      const tile = landTiles[cursorStore.hoveredTileIndex];
      console.log('Clicked and selected hovered tile:', {
        gridX: tile.position[0],
        gridY: tile.position[2],
        instanceId: cursorStore.hoveredTileIndex,
        tile: tile,
      });
    } else {
      // If there's no hovered tile when clicked, deselect any currently selected tile
      cursorStore.selectedTileIndex = null;
      console.log('Clicked, but no tile was hovered. Deselecting.');
    }
  }

  // Handle plane interactions (only for hover now)
  function handlePlaneHover(event: any) {
    const instanceId = event.instanceId;
    if (instanceId !== undefined && landTiles[instanceId]) {
      cursorStore.hoveredTileIndex = instanceId;
      // console.log('Hovered plane coordinates:', {
      //   gridX: tile.position[0],
      //   gridY: tile.position[2],
      //   landId: tile.landId,
      //   instanceId: instanceId,
      //   tile: tile,
      // });
    }
  }

  function handlePlaneLeave() {
    cursorStore.hoveredTileIndex = null;
    // console.log('Left plane');
  }

  let selectedLandTilePosition: [number, number, number] | undefined =
    $state(undefined);

  $effect(() => {
    if (
      cursorStore.selectedTileIndex !== null &&
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

<T is={Group} interactive={true} onclick={handleClickToSelectHovered}>
  {#await Promise.all( [buildingAtlas.spritesheet, biomeAtlas.spritesheet, roadAtlas.spritesheet], ) then [buildingSpritesheet, resolvedBiomeSpritesheet, roadSpritesheet]}
    <!-- Transparent interaction planes layer (still needed for hover detection) -->
    {#if interactionPlanes}
      <T
        is={interactionPlanes}
        interactive={true}
        onpointerenter={handlePlaneHover}
        onpointerleave={handlePlaneLeave}
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
            animationName={getBiomeAnimationOrFallback(
              tile,
              biomeAnimations,
              i,
            )}
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
