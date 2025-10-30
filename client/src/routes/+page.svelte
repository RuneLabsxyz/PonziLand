<script lang="ts">
  import { goto } from '$app/navigation';
  import Button from '$lib/components/ui/button/button.svelte';
  import { useAccount } from '$lib/contexts/account.svelte';
  import type { Container } from '@tsparticles/engine';
  import { loadSlim } from '@tsparticles/slim';
  import Particles, { particlesInit } from '@tsparticles/svelte';
  import { onMount } from 'svelte';
  import { fly } from 'svelte/transition';

  let particlesConfig = {
    particles: {
      color: {
        value: ['#ffffff', '#ffedd1', '#ffd700', '#fff5e6'],
      },
      links: {
        enable: false,
      },
      move: {
        enable: true,
        direction: 'bottom' as const,
        random: true,
        straight: false,
        speed: 0.3,
        outModes: {
          default: 'out' as const,
        },
      },
      number: {
        value: 300,
        density: {
          enable: true,
          area: 800,
        },
      },
      opacity: {
        value: { min: 0.1, max: 0.5 },
        animation: {
          enable: true,
          speed: 0.5,
          sync: false,
          minimumValue: 0.1,
        },
      },
      size: {
        value: { min: 1, max: 4 },
        animation: {
          enable: true,
          speed: 2,
          sync: false,
          minimumValue: 0.1,
        },
      },
      blur: {
        enable: true,
        value: 1,
      },
      shape: {
        type: 'triangle',
      },
    },
    background: {
      color: '#000000',
      opacity: 0,
    },
    interactivity: {
      events: {
        onClick: {
          enable: false,
        },
        onHover: {
          enable: false,
        },
      },
    },
  };
  let onParticlesLoaded = (event: CustomEvent<{ container: Container }>) => {
    const particlesContainer = event.detail.container;
  };
  void particlesInit(async (engine) => {
    await loadSlim(engine);
  });

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
  let showWave = false;

  onMount(() => {
    showLogo = true;
    setTimeout(() => {
      showWave = true;
    }, 3000);
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
    <Particles
      id="tsparticles"
      class="absolute z-[1] h-full w-full overflow-hidden pointer-events-none"
      options={particlesConfig}
      on:particlesLoaded={onParticlesLoaded}
    />
  </div>

  <div class="absolute inset-0 bg-black/30 z-[2]"></div>

  {#if showLogo}
    <img
      src="/logo.png"
      alt="Ponzi Land Logo"
      class="z-[3] pt-20 w-[min(500px,80vw)] animate-float"
      transition:fly={{ y: -400, duration: 1500 }}
    />
  {/if}
  {#if showWave}
    <img
      src="/home/wave.gif"
      alt="Waving Character"
      class="fixed bottom-[-100px] left-0 z-[3] h-[400px] w-auto"
      style="transform: rotate(10deg);"
      transition:fly={{ y: 300, duration: 1000 }}
    />
  {/if}

  <div class="flex flex-row gap-4">
    <Button
      variant="red"
      size="lg"
      onclick={startGame}
      class="z-[3] text-3xl px-12 py-4 font-bold"
    >
      PLAY
    </Button>
    <Button
      variant="red"
      size="lg"
      class="z-[3] text-3xl px-12 py-4 font-bold"
    >
      <a href="/tutorial">Tutorial</a>
    </Button>
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
    animation-delay: 1s;
  }
</style>
