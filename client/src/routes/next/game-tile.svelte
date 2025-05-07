<script lang="ts">
  import type { BaseLand } from '$lib/api/land';
  import Konva from 'konva';
  import { onMount, onDestroy } from 'svelte';
  import { Rect, Text } from 'svelte-konva';
  import type { Readable } from 'svelte/store';
  import LandSprite from './land-sprite.svelte';
  import { canvaStore } from './canva-store.svelte';

  const SIZE = 1024 / 64;

  const { land: landStore }: { land: Readable<BaseLand> } = $props();

  let land = $derived($landStore);

  let handle: Konva.Rect | undefined = $state();

  let loaded = false;
  let changing = $state(false);

  let fill = $derived.by(() => {
    switch (land.type) {
      case 'empty':
        return '#4a8f3f';
      case 'auction':
        return '#f27030';
      case 'building':
        return '#6f748c';
    }
  });

  let playing = false;
  let tween: Konva.Tween | undefined;

  $effect(() => {
    // Create the tween when handle is available
    if (handle && !tween) {
      tween = new Konva.Tween({
        node: handle,
        fill,
        duration: 0.5, // Reduced duration for better responsiveness during zooming/panning
        easing: Konva.Easings.EaseInOut,
        onFinish: () => {
          playing = false;
        },
      });
    }
  });

  // Update the tween when fill changes
  $effect(() => {
    if (tween) {
      tween.finish(); // Stop any current animation
    }
  });

  // React to land changes
  let unsubscribe: (() => void) | undefined;

  onMount(() => {
    unsubscribe = landStore.subscribe((value) => {
      if (!loaded) {
        loaded = true;
        return;
      }

      if (!handle) return;

      // Flash yellow when land changes
      handle.fill('#ffff00');

      if (tween) {
        tween.reset(); // Reset any current animation
        tween.play(); // Animate back to proper color
      }
    });
  });

  onDestroy(() => {
    if (unsubscribe) {
      unsubscribe();
    }

    if (tween) {
      tween.destroy();
    }
  });

  let isBuffered = $derived.by(() => {
    if (!canvaStore.stage) return false;

    const { x, y } = canvaStore.position;

    const stage = canvaStore.stage;
    const scale = canvaStore.scale;

    const stageWidth = stage.width();
    const stageHeight = stage.height();

    const stageX = stage.x();
    const stageY = stage.y();
    // Calculate the visible area with a buffer inversely proportional to scale
    const buffer = (10 * SIZE) / scale // Buffer size in pixels
    const visibleLeft = -stageX / scale - buffer;
    const visibleTop = -stageY / scale - buffer;
    const visibleRight = visibleLeft + stageWidth / scale + 2 * buffer;
    const visibleBottom = visibleTop + stageHeight / scale + 2 * buffer;

    const tileLeft = SIZE * land.location.x;
    const tileTop = SIZE * land.location.y;
    const tileRight = tileLeft + SIZE;
    const tileBottom = tileTop + SIZE;

    return (
      tileRight > visibleLeft &&
      tileLeft < visibleRight &&
      tileBottom > visibleTop &&
      tileTop < visibleBottom
    );
  });

  let isVisible = $derived.by(() => {
    if (!canvaStore.stage) return false;

    const { x, y } = canvaStore.position;

    const stage = canvaStore.stage;
    const scale = canvaStore.scale;

    const stageWidth = stage.width();
    const stageHeight = stage.height();

    const stageX = stage.x();
    const stageY = stage.y();
    const visibleLeft = -stageX / scale;
    const visibleTop = -stageY / scale;
    const visibleRight = visibleLeft + stageWidth / scale;
    const visibleBottom = visibleTop + stageHeight / scale;

    const tileLeft = SIZE * land.location.x;
    const tileTop = SIZE * land.location.y;
    const tileRight = tileLeft + SIZE;
    const tileBottom = tileTop + SIZE;

    return (
      tileRight > visibleLeft &&
      tileLeft < visibleRight &&
      tileBottom > visibleTop &&
      tileTop < visibleBottom
    );
  });
</script>

<Rect
  config={{
    x: SIZE * land.location.x,
    y: SIZE * land.location.y,
    width: SIZE,
    height: SIZE,
    fill: fill,
    strokeWidth: 0.5,
    stroke: '#000000', // Add a subtle border to help distinguish tiles
  }}
  bind:handle
></Rect>
<Text
  config={{
    x: SIZE * land.location.x + 1, // Small offset for better readability
    y: SIZE * land.location.y + 1,
    width: SIZE - 2,
    height: SIZE - 2,
    text: `${land.location.y},${land.location.x}`, // Format as coordinates
    fontSize: SIZE / 5, // Proportional font size
    fill: '#000000',
    align: 'left',
    verticalAlign: 'top',
  }}
></Text>
{#if isBuffered}
  <LandSprite
    config={{
      x: SIZE * land.location.x + 1, // Small offset for better readability
      y: SIZE * land.location.y + 1,
      width: SIZE - 2,
      height: SIZE - 2,
    }}
    {isVisible}
  />
{/if}
