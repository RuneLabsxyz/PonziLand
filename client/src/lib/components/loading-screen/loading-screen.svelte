<script lang="ts">
  import { fly } from 'svelte/transition';
  import LoadingImage from './loading-image.svelte';
  import messages from './loading-messages.json';

  let { value } = $props();

  const randomPhrase = messages[Math.floor(Math.random() * messages.length)];
  const easingFunction = (t: any, overshoot = 1) => {
    const s = overshoot;
    return 0.5 * (2 * t) * (2 * t) * ((s * 1.525 + 1) * (2 * t) - s * 1.525);
  };
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
  <LoadingImage imageUrl="/logo.png" maskProgress={value} />
  <div class="flex gap-2 items-center justify-center z-50">
    <p class="text-white text-lg leading-none">{randomPhrase}</p>
    <img src="/ui/ramp/coinGif.gif" alt="Loading" class="w-3 h-3" />
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
      radial-gradient(rgba(24, 18, 68, 0.5), rgba(14, 4, 21, 0.5)),
      url('/ui/card/texture.png');
    scale: 1.1;
  }
</style>
