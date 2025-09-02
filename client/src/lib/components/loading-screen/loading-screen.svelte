<script lang="ts">
  import { fly } from 'svelte/transition';
  import LoadingImage from './loading-image.svelte';
  import messages from './loading-messages.json';
  import RotatingCoin from './rotating-coin.svelte';
  import { loadingStore } from '$lib/stores/loading.store.svelte';

  let { value } = $props();

  const randomPhrase = messages[Math.floor(Math.random() * messages.length)];
  const easingFunction = (t: any, overshoot = 1) => {
    const s = overshoot;
    return 0.5 * (2 * t) * (2 * t) * ((s * 1.525 + 1) * (2 * t) - s * 1.525);
  };

  // Combine regular loading with 3D assets
  let totalProgress = $derived(() => {
    const regularProgress = value || 0;
    const assetsProgress = loadingStore.totalProgress * 100;
    // Weight them equally (50% regular loading, 50% 3D assets)
    return (regularProgress + assetsProgress) / 2;
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

    <!-- 3D Assets Loading Progress -->
    <div class="flex flex-col gap-2 items-center text-white text-sm opacity-80">
      <div class="flex gap-2 items-center">
        <span
          >Spritesheets: {Math.round(
            loadingStore.spritesheetProgress * 100,
          )}%</span
        >
        <div class="w-20 h-1 bg-gray-700 rounded">
          <div
            class="h-full bg-blue-400 rounded transition-all duration-300"
            style="width: {loadingStore.spritesheetProgress * 100}%"
          ></div>
        </div>
      </div>

      <div class="flex gap-2 items-center">
        <span>Assets: {Math.round(loadingStore.assetProgress * 100)}%</span>
        <div class="w-20 h-1 bg-gray-700 rounded">
          <div
            class="h-full bg-green-400 rounded transition-all duration-300"
            style="width: {loadingStore.assetProgress * 100}%"
          ></div>
        </div>
      </div>

      <div class="text-xs opacity-60">
        3D Assets: {loadingStore.spritesheets.loaded +
          loadingStore.assets.loaded}/{loadingStore.spritesheets.total +
          loadingStore.assets.total}
      </div>
    </div>

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
