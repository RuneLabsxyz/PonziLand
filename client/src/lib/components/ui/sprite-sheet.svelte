<script lang="ts">
  import { cn } from '$lib/utils';
  import { onMount, onDestroy } from 'svelte';

  const {
    class: className = '',
    src,
    x: initialX = 0,
    y: initialY = 0,
    xSize,
    ySize,
    xMax,
    yMax,
    width,
    height,
    // Animation properties
    animate = false, // Whether to animate
    frameDelay = 100, // Delay between frames in milliseconds
    startFrame = 0, // Starting frame index
    endFrame: initialEndFrame = undefined, // Ending frame index (defaults to max frame)
    loop = true, // Whether to loop the animation
    horizontal = true, // Animation direction (horizontal or vertical)
    autoplay = true, // Start animation automatically
  } = $props();

  // Calculate total frames based on sprite sheet dimensions
  const totalFramesX = Math.floor(xMax / xSize);
  const totalFramesY = Math.floor(yMax / ySize);

  // Default end frame if not specified
  const endFrame = $state(
    initialEndFrame === undefined
      ? horizontal
        ? totalFramesX - 1
        : totalFramesY - 1
      : initialEndFrame,
  );

  // Animation state
  let currentFrame = $state(startFrame);
  let animationInterval = $state();
  let isPlaying = $state(autoplay && animate);

  // Sprite position
  let x = $state(initialX);
  let y = $state(initialY);

  // Calculate ratios for background sizing
  let xRatio = $derived(width / xSize);
  let yRatio = $derived(height / ySize);

  let bgWidth = $derived(xRatio * xMax);
  let bgHeight = $derived(yRatio * yMax);

  // Update sprite position when frame changes
  $effect(() => {
    if (animate && horizontal) {
      x = currentFrame % totalFramesX;
      y = Math.floor(currentFrame / totalFramesX);
    } else if (animate && !horizontal) {
      y = currentFrame % totalFramesY;
      x = Math.floor(currentFrame / totalFramesY);
    }
  });

  // Animation control functions
  function startAnimation() {
    if (!animate || animationInterval) return;

    isPlaying = true;
    animationInterval = setInterval(() => {
      currentFrame++;

      // Check if we've reached the end frame
      if (currentFrame > endFrame) {
        if (loop) {
          currentFrame = startFrame;
        } else {
          stopAnimation();
        }
      }
    }, frameDelay);
  }

  function stopAnimation() {
    if (animationInterval) {
      clearInterval(animationInterval);
      animationInterval = null;
      isPlaying = false;
    }
  }

  function resetAnimation() {
    currentFrame = startFrame;
    if (isPlaying) {
      stopAnimation();
      startAnimation();
    }
  }

  // Lifecycle hooks
  onMount(() => {
    if (animate && autoplay) {
      startAnimation();
    }
  });

  onDestroy(() => {
    stopAnimation();
  });

  // Export API
  const controls = {
    play: startAnimation,
    pause: stopAnimation,
    reset: resetAnimation,
    get isPlaying() {
      return isPlaying;
    },
  };
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
