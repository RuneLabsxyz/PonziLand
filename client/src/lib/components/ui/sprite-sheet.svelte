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

<style>
  .selected {
    --stroke-offset: 0.5px;
    filter: drop-shadow(0 calc(-1 * var(--stroke-offset)) 0 #ff0)
      drop-shadow(calc(-1 * var(--stroke-offset)) 0 0 #ff0)
      drop-shadow(var(--stroke-offset) 0 0 #ff0);
  }

  .selected.Biome {
    filter: drop-shadow(0 calc(-1 * var(--stroke-offset)) 0 #ff0)
      drop-shadow(calc(-1 * var(--stroke-offset)) 0 0 #ff0)
      drop-shadow(var(--stroke-offset) 0 0 #ff0)
      drop-shadow(0 var(--stroke-offset) 0 #ff0);
  }

  .hovering {
    --stroke-offset: 0.5px;
    filter: drop-shadow(0 calc(-1 * var(--stroke-offset)) 0 #ff0)
      drop-shadow(calc(-1 * var(--stroke-offset)) 0 0 #ff0)
      drop-shadow(var(--stroke-offset) 0 0 #ff0);
  }

  .hovering.Biome {
    filter: drop-shadow(0 calc(-1 * var(--stroke-offset)) 0 #ff0)
      drop-shadow(calc(-1 * var(--stroke-offset)) 0 0 #ff0)
      drop-shadow(var(--stroke-offset) 0 0 #ff0)
      drop-shadow(0 var(--stroke-offset) 0 #ff0);
  }
</style>
