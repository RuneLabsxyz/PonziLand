<script lang="ts">
  import { cn } from '$lib/utils';

  let {
    class: className = '',
    src,
    x,
    y,
    xSize,
    ySize,
    xMax,
    yMax,
    width,
    height,
  } = $props();

  let xRatio = $derived(width / xSize);
  let yRatio = $derived(height / ySize);

  let bgWidth = $derived(xRatio * xMax);
  let bgHeight = $derived(yRatio * yMax);
</script>

<div
  style="background-image: url({src}); background-position: -{x * width}px -{y *
    height}px; background-size: {bgWidth}px {bgHeight}px; background-repeat: no-repeat; width: {width}px; height: {height}px;"
  class={cn(``, className)}
></div>
