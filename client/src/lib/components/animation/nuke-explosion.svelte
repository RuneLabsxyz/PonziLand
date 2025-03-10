<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';

  let {
    width = 0,
    height = 0,
    biomeX = 0,
    biomeY = 0,
    visible = true,
  } = $props();

  let opacity = $state(0);

  onMount(() => {
    // Start animation from 0 to 1 opacity
    const animation = () => {
      const start = performance.now();
      const duration = 1500; // 1.5 seconds

      const step = (timestamp: any) => {
        const elapsed = timestamp - start;
        const progress = Math.min(elapsed / duration, 1);

        // Update opacity value from 0 to 1
        opacity = progress;

        if (progress < 1) {
          requestAnimationFrame(step);
        }
      };

      requestAnimationFrame(step);
    };

    animation();
  });
</script>

{#if visible}
  <div
    class="absolute h-full w-full top-0 bottom-0 left-0 right-0 overflow-hidden z-20"
    style="mask-image: url('/sheets/biomes.png'); mask-position: {-biomeX *
      width}px {-biomeY * height}px; mask-size: {(2048 / 256) *
      width}px {(3072 / 256) * height}px;"
    transition:fade={{ duration: 200 }}
  >
    <div
      class="absolute h-full w-full top-0 bottom-0 left-0 right-0"
      style="background-color: white; opacity: {opacity};"
    ></div>
  </div>
{/if}
