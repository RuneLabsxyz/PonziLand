<script>
  import { goto } from '$app/navigation';
  import { setupAccount, useAccount } from '$lib/contexts/account.svelte';
  import { dojoConfig } from '$lib/dojoConfig';
  import { onMount } from 'svelte';

  // setup account
  //
  const account = useAccount();

  async function startGame() {
    const accountProvider = account;
    if (accountProvider == null) {
      console.log('No accountProvider?!?');
      return;
    }
    await accountProvider.promptForLogin();

    console.log('Got the confirmation that it worked!');
    goto('/game');
  }

  // Video boomerang effect
  let videoElement;

  onMount(() => {
    if (videoElement) {
      // Skip the first 2 seconds of the video
      videoElement.currentTime = 2;

      // Set up the boomerang effect from 2 to 5 seconds
      videoElement.addEventListener('timeupdate', () => {
        if (videoElement.currentTime >= 5) {
          videoElement.currentTime = 2; // Reset to 2 seconds
        }
      });
    }
  });
</script>

<main
  class="relative flex flex-col items-center justify-center h-screen overflow-hidden"
>
  <!-- Video background with explosion effect -->
  <div class="absolute inset-0 overflow-hidden">
    <video
      bind:this={videoElement}
      autoplay
      muted
      loop
      playsinline
      class="absolute w-full h-auto min-h-screen object-cover"
      style="transform: scale(1.2) translateY(-15%);"
    >
      <source src="/home/EXPLOSION.mp4" type="video/mp4" />
    </video>
  </div>

  <!-- Overlay to ensure text is visible over video -->
  <div class="absolute inset-0 bg-black/30 z-0"></div>

  <h1 class="text-6xl font-bold mb-8 text-white drop-shadow-lg z-10">
    Ponzi Land
  </h1>
  <button
    on:click={startGame}
    class="px-12 py-4 text-xl text-white bg-white/20 backdrop-blur-sm rounded-lg
               hover:bg-white/30 transition-all transform hover:scale-105 z-10
               border-2 border-white/30 hover:border-white/50 shadow-lg"
  >
    Play
  </button>

  <div
    class="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10 flex flex-col items-center"
  >
    <p class="text-white text-xl mb-4">Super official sponsors</p>
    <div class="flex items-center justify-center gap-8">
      <div class="flex flex-col items-center gap-4">
        <div class="text-white/50 text-sm">Master of dojo</div>
        <img src="/home/tarrence.png" alt="Tarrance" class="h-24 w-auto" />
      </div>
      <div class="flex flex-col items-center gap-4">
        <div class="text-white/50 text-sm">Matcha boy</div>
        <img src="/home/calc.png" alt="Calc" class="h-24 w-auto" />
      </div>
    </div>
  </div>
  <div
    class="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10 flex flex-col items-center"
  >
    <p class="text-white text-xl mb-4">Super official sponsors</p>
    <div class="flex items-center justify-center gap-8">
      <div class="flex flex-col items-center gap-4">
        <div class="text-white/50 text-sm">Master of dojo</div>
        <img src="/home/tarrence.png" alt="Tarrance" class="h-24 w-auto" />
      </div>
      <div class="flex flex-col items-center gap-4">
        <div class="text-white/50 text-sm">Matcha boy</div>
        <img src="/home/calc.png" alt="Calc" class="h-24 w-auto" />
      </div>
    </div>
  </div>
</main>

<style>
  /* Removed duplicate keyframes and unnecessary animations since we're using video now */
</style>
