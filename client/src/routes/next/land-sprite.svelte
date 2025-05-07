<script lang="ts">
  import Konva from 'konva';
  import { onDestroy, onMount } from 'svelte';
  import { Sprite } from 'svelte-konva';
  import { canvaStore } from './canva-store.svelte';

  let { config, isVisible }: { config: Partial<Konva.SpriteConfig>, isVisible: boolean } = $props();

  let handle: Konva.Sprite | undefined = $state();

  const image = new Image();
  image.src = '/tokens/eSTRK/3-animated.png';

  const SIZE = 192;

  let scale = $derived.by(() => {
    if (config.width && config.height) {
      return Math.min(config.width / SIZE, config.height / SIZE);
    }
    return 1;
  });

  const animations = {
    castle: [
      0 * SIZE,
      0 * SIZE,
      SIZE,
      SIZE,

      1 * SIZE,
      0 * SIZE,
      SIZE,
      SIZE,

      2 * SIZE,
      0 * SIZE,
      SIZE,
      SIZE,

      3 * SIZE,
      0 * SIZE,
      SIZE,
      SIZE,

      4 * SIZE,
      0 * SIZE,
      SIZE,
      SIZE,

      5 * SIZE,
      0 * SIZE,
      SIZE,
      SIZE,
    ],
  };

  onMount(() => {
    if (handle) {
      handle.start()
    }
  })

  onDestroy(() => {
    if (handle) {
      handle.stop()
    }
  })

  $effect(() => {
    if (handle === undefined) {
      return;
    }
    if (canvaStore.scale > 5 && isVisible) {
      handle.start()
    } else {
      handle?.stop()
    }
  })
</script>

<Sprite
  bind:handle
  config={{
    x: config.x,
    y: config.y,
    width: config.width,
    height: config.height,
    scaleX: scale,
    scaleY: scale,
    image: image,
    animations: animations,
    animation: 'castle',
    frameRate: 10,
    frameIndex: 0,
  }}
/>
