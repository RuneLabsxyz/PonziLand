<script lang="ts">
  import type { Token } from '$lib/interfaces';
  import Konva from 'konva';
  import { onDestroy, onMount } from 'svelte';
  import { Sprite } from 'svelte-konva';

  let {
    config,
    isVisible,
    token,
    grass = false,
    basic = false,
    auction = false,
    road = false,
    biome = false,
    seed = '',
    level = 1,
    selected = false,
    hovering = false,
  }: {
    config: Partial<Konva.SpriteConfig>;
    isVisible: boolean;
    token?: Token;
    grass?: boolean;
    basic?: boolean;
    auction?: boolean;
    road?: boolean;
    biome?: boolean;
    seed?: string;
    level?: Level;
    selected?: boolean;
    hovering?: boolean;
  } = $props();

  let handle: Konva.Sprite | undefined = $state();

  // Load images
  const images = {
    road: new Image(),
    grass: new Image(),
    auction: new Image(),
    biome: new Image(),
    building: new Image(),
    basic: new Image(),
  };

  images.road.src = '/land-display/road.png';
  images.grass.src = '/land-display/empty.png';
  images.auction.src = '/land-display/empty.png';
  images.biome.src = '/tokens/+global/biomes.png';
  images.building.src = '/tokens/+global/buildings.png';
  images.basic.src = '/tokens/basic/1.png';

  if (token) {
    if (token.images.building[level].frames) {
      images.building.src = `/tokens/${token.symbol}/${level}-animated.png`;
    } else {
      images.building.src = '/tokens/+global/buildings.png';
    }
  }

  let SIZE = biome
    ? 256
    : road
      ? 320
      : (token?.images.building[level].xSize ?? 256);

  let scale = $derived.by(() => {
    if (config.width && config.height) {
      return Math.min(config.width / SIZE, config.height / SIZE);
    }
    return 1;
  });

  // Animation frames for different states
  const animations = {
    road: [0, 0, 320, 320],
    grass: Array.from({ length: 7 }, (_, i) => [
      (i % 4) * 256,
      Math.floor(i / 3) * 256,
      256,
      256,
    ]).flat(),
    auction: [3 * 256, 2 * 256, 256, 256],
    biome: token
      ? [token.images.biome.x * 256, token.images.biome.y * 256, 256, 256]
      : [],
    building: token
      ? (() => {
          const buildingMeta = token.images.building[level];
          const xSize = buildingMeta.xSize ?? 256;
          const ySize = buildingMeta.ySize ?? 256;
          if (buildingMeta.frames) {
            return Array.from({ length: buildingMeta.frames }, (_, i) => [
              i * xSize,
              0,
              xSize,
              ySize,
            ]).flat();
          }
          return [buildingMeta.x * xSize, buildingMeta.y * ySize, xSize, ySize];
        })()
      : [],
    basic: [0, 0, 256, 256],
  };

  // Determine which animation to use
  let currentAnimation = $derived(() => {
    if (road) return 'road';
    if (grass) return 'grass';
    if (auction) return 'auction';
    if (biome) return 'biome';
    if (token) return 'building';
    if (basic) return 'basic';
    return 'grass';
  });

  // Get animation metadata for token buildings
  let frameRate = $state(10);
  $effect(() => {
    if (
      token?.images.building[level].frames &&
      token.images.building[level].delay
    ) {
      frameRate = 1000 / token.images.building[level].delay;
    } else {
      frameRate = 10;
    }
  });

  onMount(() => {
    if (handle && token) {
      handle.start();
    }
  });

  onDestroy(() => {
    if (handle && token) {
      handle.stop();
    }
  });

  $effect(() => {
    if (handle === undefined || token === undefined) {
      return;
    }
    if (canvaStore.scale > 5 && isVisible) {
      handle.start();
    } else {
      handle?.stop();
    }
  });
</script>

<Sprite
  bind:handle
  config={{
    ...config,
    scaleX: scale,
    scaleY: scale,
    image: images[currentAnimation()],
    animations: animations,
    animation: currentAnimation(),
    frameRate,
    frameIndex: 0,
    shadowColor: 'black',
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowOpacity: 0.5,
    shadowBlur: 10,
    shadowEnabled: hovering,
  }}
/>

<style>
  :global(.selected) {
    --stroke-offset: 0.5px;
    filter: drop-shadow(0 calc(-1 * var(--stroke-offset)) 0 #ff0)
      drop-shadow(calc(-1 * var(--stroke-offset)) 0 0 #ff0)
      drop-shadow(var(--stroke-offset) 0 0 #ff0);
  }

  :global(.selected.Biome) {
    filter: drop-shadow(0 calc(-1 * var(--stroke-offset)) 0 #ff0)
      drop-shadow(calc(-1 * var(--stroke-offset)) 0 0 #ff0)
      drop-shadow(var(--stroke-offset) 0 0 #ff0)
      drop-shadow(0 var(--stroke-offset) 0 #ff0);
  }

  :global(.hovering) {
    --stroke-offset: 0.5px;
    filter: drop-shadow(0 calc(-1 * var(--stroke-offset)) 0 #ff0)
      drop-shadow(calc(-1 * var(--stroke-offset)) 0 0 #ff0)
      drop-shadow(var(--stroke-offset) 0 0 #ff0);
  }

  :global(.hovering.Biome) {
    filter: drop-shadow(0 calc(-1 * var(--stroke-offset)) 0 #ff0)
      drop-shadow(calc(-1 * var(--stroke-offset)) 0 0 #ff0)
      drop-shadow(var(--stroke-offset) 0 0 #ff0)
      drop-shadow(0 var(--stroke-offset) 0 #ff0);
  }
</style>
