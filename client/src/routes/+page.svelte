<script lang="ts">
  import { goto } from '$app/navigation';
  import { setupAccount, useAccount } from '$lib/contexts/account.svelte';
  import { dojoConfig } from '$lib/dojoConfig';
  import { onMount } from 'svelte';
  import { fly } from 'svelte/transition';
  import Button from '$lib/components/ui/button/button.svelte';

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

  let showLogo = false;

  onMount(() => {
    showLogo = true;
  });
</script>

<main
  class="relative flex flex-col items-center justify-start h-screen overflow-hidden"
>
  <!-- Image background -->
  <div class="absolute inset-0 overflow-hidden">
    <img
      src="/home/hero.png"
      alt="Hero"
      class="absolute w-full h-full object-cover"
      style="transform: scale(1.2);"
    />
  </div>

  <div class="absolute inset-0 bg-black/30 z-0"></div>

  {#if showLogo}
    <img
      src="/logo.png"
      alt="Ponzi Land Logo"
      class="z-10 pt-20 w-[min(500px,80vw)] animate-float"
      transition:fly={{ y: -400, duration: 1500 }}
    />
  {/if}

  <Button
    variant="red"
    on:click={startGame}
    class="z-20 text-xl px-12 py-4 font-bold">Play</Button
  >

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
  @keyframes float {
    0% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-15px);
    }
    100% {
      transform: translateY(0px);
    }
  }

  .animate-float {
    animation: float 3s ease-in-out infinite;
    animation-delay: 1s; /* Start floating after initial entrance animation */
  }
</style>
