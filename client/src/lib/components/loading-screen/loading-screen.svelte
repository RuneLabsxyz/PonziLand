<script lang="ts">
  import { fly } from 'svelte/transition';
  import LoadingImage from './loading-image.svelte';
  import messages from './loading-messages.json';
  import RotatingCoin from './rotating-coin.svelte';
  import LoadingProgressBars from './loading-progress-bars.svelte';
  import LoadingChecklist from './loading-checklist.svelte';
  import { loadingStore } from '$lib/stores/loading.store.svelte';

  let { value } = $props();

  // Component constants
  const SHOW_PROGRESS_BARS = false;
  const SHOW_CHECKLIST = true;

  const randomPhrase = messages[Math.floor(Math.random() * messages.length)];
  const easingFunction = (t: any, overshoot = 1) => {
    const s = overshoot;
    return 0.5 * (2 * t) * (2 * t) * ((s * 1.525 + 1) * (2 * t) - s * 1.525);
  };

  // Combine regular loading with 3D assets
  let totalProgress = $derived(() => {
    const regularProgress = value || 0;
    const assetsProgress = loadingStore.totalProgress * 100;
    // Weight them based on ratio
    return regularProgress + assetsProgress;
  });
</script>

<div
  transition:fly={{
    y: '-100%',
    duration: 1000,
    opacity: 1,
    easing: easingFunction,
  }}
  class="Container absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center flex-col z-[1000] overflow-visible scale-[1.3]"
>
  <LoadingImage imageUrl="/logo.png" maskProgress={totalProgress()} />
  <div class="flex flex-col gap-4 items-center justify-center z-50">
    <p class="text-white text-lg leading-none">{randomPhrase}</p>

    <!-- Loading Display Components -->
    {#if SHOW_PROGRESS_BARS}
      <LoadingProgressBars />
    {/if}
    {#if SHOW_CHECKLIST}
      <LoadingChecklist />
    {/if}

    <RotatingCoin />
  </div>
</div>

<style>
  .Container::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 100vw;
    height: 100vh;
    transform: translate(-50%, -50%);
    background:
      radial-gradient(#18124480, rgba(14, 4, 21, 0.5)),
      url('/ui/card/texture.png');
    scale: 1.1;
  }
</style>
