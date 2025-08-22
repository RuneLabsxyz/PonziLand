<script lang="ts">
  import { cn } from '$lib/utils';
  import { onMount, onDestroy } from 'svelte';
  import { cameraPosition } from '$lib/stores/camera';
  import { MIN_SCALE_FOR_ANIMATION } from '$lib/const';

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
    boomerang = false, // Whether to reverse the animation
    horizontal = true, // Animation direction (horizontal or vertical)
    autoplay = true, // Start animation automatically
    delay = 0,
  } = $props();

  // Calculate total frames based on sprite sheet dimensions
  let totalFramesX = $derived(Math.floor(xMax / xSize));
  let totalFramesY = $derived(Math.floor(yMax / ySize));

  // Default end frame if not specified
  let endFrame = $derived(
    initialEndFrame === undefined
      ? horizontal
        ? totalFramesX - 1
        : totalFramesY - 1
      : initialEndFrame,
  );

  // Animation state
  let currentFrame = $state(startFrame);
  let animationFrameId = $state<number | null>(null);
  let restartTimeout = $state<number | null>(null);
  let isPlaying = $state(autoplay && animate);
  let direction = $state(1);
  let lastFrameTime = $state(0);
  let isWaiting = $state(false);

  // Sprite position
  let x = $derived(initialX);
  let y = $derived(initialY);

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

  // Effect to handle camera scale changes and viewport visibility
  $effect(() => {
    const scale = cameraPosition.scale;
    if (scale < MIN_SCALE_FOR_ANIMATION && isPlaying) {
      stopAnimation();
    } else if (
      scale >= MIN_SCALE_FOR_ANIMATION &&
      !isPlaying &&
      animate &&
      autoplay
    ) {
      startAnimation();
    }
  });

  function animateFrame(timestamp: number) {
    if (!isPlaying) return;

    if (!lastFrameTime) lastFrameTime = timestamp;
    const elapsed = timestamp - lastFrameTime;

    if (elapsed >= frameDelay && !isWaiting) {
      currentFrame += direction;
      lastFrameTime = timestamp;

      // Check if we've reached the end frame or start frame
      if (currentFrame >= endFrame) {
        if (boomerang) {
          isWaiting = true;
          restartTimeout = window.setTimeout(() => {
            direction = -1; // Reverse direction
            currentFrame = endFrame; // Ensure we don't go past the end frame
            isWaiting = false;
          }, delay);
        } else if (!loop) {
          stopAnimation();
        } else {
          isWaiting = true;
          restartTimeout = window.setTimeout(() => {
            currentFrame = startFrame;
            isWaiting = false;
          }, delay);
        }
      } else if (currentFrame <= startFrame) {
        if (boomerang) {
          isWaiting = true;
          restartTimeout = window.setTimeout(() => {
            direction = 1; // Forward direction
            currentFrame = startFrame; // Ensure we don't go past the start frame
            isWaiting = false;
          }, delay);
        } else {
          direction = 1; // Forward direction
        }
      }
    }

    if (isPlaying) {
      animationFrameId = requestAnimationFrame(animateFrame);
    }
  }

  function startAnimation() {
    if (
      !animate ||
      animationFrameId ||
      cameraPosition.scale < MIN_SCALE_FOR_ANIMATION
    )
      return;

    isPlaying = true;
    lastFrameTime = 0;
    animationFrameId = requestAnimationFrame(animateFrame);
  }

  function stopAnimation() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    // Clear the restart timeout if it exists
    if (restartTimeout) {
      clearTimeout(restartTimeout);
      restartTimeout = null;
    }

    isPlaying = false;
    isWaiting = false;
  }

  // Lifecycle hooks
  onMount(() => {
    if (
      animate &&
      autoplay &&
      cameraPosition.scale >= MIN_SCALE_FOR_ANIMATION
    ) {
      startAnimation();
    }
  });

  onDestroy(() => {
    stopAnimation();
  });
</script>

<div
  style="background-image: url({src}); background-position: -{x * width}px -{y *
    height}px; background-size: {bgWidth}px {bgHeight}px; background-repeat: no-repeat; width: {width}px; height: {height}px;"
  class={cn(``, className)}
></div>

<style>
  .selected {
    --stroke-offset: 2px;
    -webkit-filter: drop-shadow(0 calc(-1 * var(--stroke-offset)) 0 #ff0)
      drop-shadow(calc(-1 * var(--stroke-offset)) 0 0 #ff0)
      drop-shadow(var(--stroke-offset) 0 0 #ff0);
    filter: drop-shadow(0 calc(-1 * var(--stroke-offset)) 0 #ff0)
      drop-shadow(calc(-1 * var(--stroke-offset)) 0 0 #ff0)
      drop-shadow(var(--stroke-offset) 0 0 #ff0);
  }

  div.selected.Biome {
    -webkit-filter: drop-shadow(0 calc(-1 * var(--stroke-offset)) 0 #ff0)
      drop-shadow(calc(-1 * var(--stroke-offset)) 0 0 #ff0)
      drop-shadow(var(--stroke-offset) 0 0 #ff0)
      drop-shadow(0 var(--stroke-offset) 0 #ff0);
    filter: drop-shadow(0 calc(-1 * var(--stroke-offset)) 0 #ff0)
      drop-shadow(calc(-1 * var(--stroke-offset)) 0 0 #ff0)
      drop-shadow(var(--stroke-offset) 0 0 #ff0)
      drop-shadow(0 var(--stroke-offset) 0 #ff0);
  }

  .hovering {
    --stroke-offset: 2px;
    -webkit-filter: drop-shadow(0 calc(-1 * var(--stroke-offset)) 0 #ff0)
      drop-shadow(calc(-1 * var(--stroke-offset)) 0 0 #ff0)
      drop-shadow(var(--stroke-offset) 0 0 #ff0);
    filter: drop-shadow(0 calc(-1 * var(--stroke-offset)) 0 #ff0)
      drop-shadow(calc(-1 * var(--stroke-offset)) 0 0 #ff0)
      drop-shadow(var(--stroke-offset) 0 0 #ff0);
  }

  div.hovering.Biome {
    -webkit-filter: drop-shadow(0 calc(-1 * var(--stroke-offset)) 0 #ff0)
      drop-shadow(calc(-1 * var(--stroke-offset)) 0 0 #ff0)
      drop-shadow(var(--stroke-offset) 0 0 #ff0)
      drop-shadow(0 var(--stroke-offset) 0 #ff0);
    filter: drop-shadow(0 calc(-1 * var(--stroke-offset)) 0 #ff0)
      drop-shadow(calc(-1 * var(--stroke-offset)) 0 0 #ff0)
      drop-shadow(var(--stroke-offset) 0 0 #ff0)
      drop-shadow(0 var(--stroke-offset) 0 #ff0);
  }

  .highlighted {
    --stroke-offset: 2px;
    -webkit-filter: drop-shadow(0 calc(-1 * var(--stroke-offset)) 0 #00ffff)
      drop-shadow(calc(-1 * var(--stroke-offset)) 0 0 #00ffff)
      drop-shadow(var(--stroke-offset) 0 0 #00ffff);
    filter: drop-shadow(0 calc(-1 * var(--stroke-offset)) 0 #00ffff)
      drop-shadow(calc(-1 * var(--stroke-offset)) 0 0 #00ffff)
      drop-shadow(var(--stroke-offset) 0 0 #00ffff);
  }

  .highlighted.Biome {
    -webkit-filter: drop-shadow(0 calc(-1 * var(--stroke-offset)) 0 #00ffff)
      drop-shadow(calc(-1 * var(--stroke-offset)) 0 0 #00ffff)
      drop-shadow(var(--stroke-offset) 0 0 #00ffff)
      drop-shadow(0 var(--stroke-offset) 0 #00ffff);
    filter: drop-shadow(0 calc(-1 * var(--stroke-offset)) 0 #00ffff)
      drop-shadow(calc(-1 * var(--stroke-offset)) 0 0 #00ffff)
      drop-shadow(var(--stroke-offset) 0 0 #00ffff)
      drop-shadow(0 var(--stroke-offset) 0 #00ffff);
  }
</style>
