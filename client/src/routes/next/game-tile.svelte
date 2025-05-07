<script lang="ts">
  import type { BaseLand } from '$lib/api/land';
  import Konva from 'konva';
  import { onMount } from 'svelte';
  import { Rect, Text } from 'svelte-konva';
  import type { Readable } from 'svelte/store';

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

  const tweenBack = $derived(
    new Konva.Tween({
      node: handle!,
      fill,
      duration: 10,
      easing: Konva.Easings.EaseInOut,
      onFinish: () => {
        playing = false;
      },
    }),
  );

  onMount(() => {
    return landStore.subscribe((value) => {
      if (!loaded) {
        loaded = true;
        return;
      }
      console.log('land changed');

      handle!.fill('#ffff00');

      tweenBack.play();

      return () => {
        // Go back to the final state
        tweenBack.finish();
      };
    });
  });
</script>

<Rect
  config={{
    x: SIZE * land.location.x,
    y: SIZE * land.location.y,
    width: SIZE,
    height: SIZE,
    fill: fill,
  }}
  bind:handle
>
</Rect>
<Text config={{
  x: SIZE * land.location.x,
  y: SIZE * land.location.y,
  width: SIZE,
  height: SIZE,
  text: land.location.y.toString() + land.location.x.toString(),
  fontSize: 3,
}}></Text>