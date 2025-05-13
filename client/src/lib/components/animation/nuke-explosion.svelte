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

  import { gsap } from 'gsap';

  onMount(() => {
    // Create a timeline to animate opacity from 0 to 1 and then back to 0
    const tl = gsap.timeline();
    tl.to('.flashing-biome', {
      duration: 0.3,
      opacity: 1,
    }).to('.flashing-biome', {
      duration: 1.5,
      opacity: 0,
    });
  });
</script>

{#if visible}
  <div
    class="absolute h-full w-full top-0 bottom-0 left-0 right-0 overflow-hidden z-20"
    style="mask-image: url('/tokens/+global/biomes.png'); mask-position: {-biomeX *
      width}px {-biomeY * height}px; mask-size: {(2048 / 256) *
      width}px {(3328 / 256) * height}px;"
  >
    <div
      class="flashing-biome absolute h-full w-full top-0 bottom-0 left-0 right-0"
      style="background-color: white; opacity: {opacity};"
    ></div>
  </div>
{/if}
