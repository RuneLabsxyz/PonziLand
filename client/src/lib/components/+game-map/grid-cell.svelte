<!-- GridCell.svelte -->
<script>
  import { T } from '@threlte/core';

  let {
    x = 0,
    z = 0,
    hasRoad = false,
    biomeType = 0,
    hasBuilding = false,
    roadTexture = null,
    biomeTexture = null,
    buildingTexture = null,
    time = 0,
    animationOffset = 0,
  } = $props();

  const SPRITE_SIZE = 1;

  // Derived animations using runes
  let biomeRotation = $derived(Math.sin(time + animationOffset) * 0.1);
  let buildingFloat = $derived(
    0.03 + Math.sin(time * 2 + animationOffset) * 0.05,
  );
  let buildingScale = $derived(
    SPRITE_SIZE * 0.8 + Math.sin(time * 3 + animationOffset) * 0.05,
  );

  // Color variation based on biome type
  let biomeOpacity = $derived(
    0.7 + Math.sin(time * 0.5 + animationOffset) * 0.1,
  );
</script>

<T.Group position={[x, 0, z]}>
  <!-- Road Layer -->
  {#if hasRoad && roadTexture}
    <T.Sprite position={[0, 0.01, 0]} scale={[SPRITE_SIZE, SPRITE_SIZE, 1]}>
      <T.SpriteMaterial map={roadTexture} transparent={true} opacity={0.9} />
    </T.Sprite>
  {/if}

  <!-- Biome Layer with rotation and opacity animation -->
  {#if biomeTexture}
    <T.Sprite
      position={[0, 0.02, 0]}
      scale={[SPRITE_SIZE, SPRITE_SIZE, 1]}
      rotation={[0, 0, biomeRotation]}
    >
      <T.SpriteMaterial
        map={biomeTexture}
        transparent={true}
        opacity={biomeOpacity}
      />
    </T.Sprite>
  {/if}

  <!-- Building Layer with floating and scaling animation -->
  {#if hasBuilding && buildingTexture}
    <T.Sprite
      position={[0, buildingFloat, 0]}
      scale={[buildingScale, buildingScale, 1]}
    >
      <T.SpriteMaterial
        map={buildingTexture}
        transparent={true}
        opacity={0.9}
      />
    </T.Sprite>
  {/if}
</T.Group>
