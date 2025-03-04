<script lang="ts">
  import { fade } from 'svelte/transition';
  import ThreeDots from './three-dots.svelte';
  import Progress from '../ui/progress/progress.svelte';
  import LoadingImage from './loading-image.svelte';
  import messages from './loading-messages.json';

  let { value } = $props();

  const randomPhrase = messages[Math.floor(Math.random() * messages.length)];
</script>

<div
  transition:fade
  class="Container absolute inset-0 flex items-center justify-center flex-col z-50 dark"
>
  <LoadingImage imageUrl="/logo.png" maskProgress={value} />
  <div class="flex gap-2 items-center justify-center">
    <p class="text-white text-lg leading-none">{randomPhrase}</p>
    <img src="/assets/ui/ramp/coinGif.gif" alt="Loading" class="w-3 h-3" />
  </div>
</div>

<style>
  .Container {
    background: radial-gradient(rgba(24, 18, 68, 0.5), rgba(14, 4, 21, 0.5)),
      url('/assets/ui/texture.png');
  }
</style>
