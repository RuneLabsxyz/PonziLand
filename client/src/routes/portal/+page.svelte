<script lang="ts">
  import { goto } from '$app/navigation';
  import Button from '$lib/components/ui/button/button.svelte';
  import { useAccount } from '$lib/contexts/account.svelte';
  import type { Container } from '@tsparticles/engine';
  import { loadSlim } from '@tsparticles/slim';
  import Particles, { particlesInit } from '@tsparticles/svelte';
  import { onMount } from 'svelte';
  import { fly } from 'svelte/transition';
  import OnboardingWalletInfo from '$lib/components/+game-ui/widgets/wallet/onboarding-wallet-info.svelte';
  import accountDataProvider from '$lib/account.svelte';

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
          enable: true,
          mode: 'bubble',
        },
      },
      modes: {
        bubble: {
          distance: 100,
          size: 8,
          duration: 0.4,
          opacity: 0.8,
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

  let isLogin = $derived(accountDataProvider.isConnected);

  // setup account
  const account = useAccount();

  async function startGame() {
    if (!isLogin) {
      const accountProvider = account;
      if (accountProvider == null) {
        console.log('No accountProvider?!?');
        return;
      }
      await accountProvider.promptForLogin();
    }
    goto('/game');
  }

  let showLogo = $state(false);
  let showWave = $state(false);
  let showExperience = $state(false);

  onMount(() => {
    showLogo = true;
    setTimeout(() => {
      showWave = true;
    }, 3000);
    setTimeout(() => {
      showExperience = true;
    }, 1500);
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

  <!-- Dynamic overlay with mouse reveal effect -->
  <div class="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
    <div
      class="absolute"
      style="
        background: radial-gradient(
          ellipse 1000px 700px at 50% 50%, 
          transparent 0%, 
          rgba(0,0,0,0.1) 20%,
          rgba(0,0,0,0.3) 35%, 
          rgba(0,0,0,0.6) 50%, 
          rgba(0,0,0,0.85) 65%, 
          rgba(0,0,0,0.95) 80%, 
          rgba(0,0,0,1) 100%
        );
        width: 200vw;
        height: 200vh;
        left: -50vw;
        top: -50vh;
      "
    ></div>
  </div>

  <!-- Particles in front of overlay -->
  <Particles
    id="tsparticles"
    class="absolute z-[2] h-full w-full overflow-hidden"
    options={particlesConfig}
  />

  {#if showLogo}
    <img
      src="/logo.png"
      alt="Ponzi Land Logo"
      class="z-[3] pt-20 w-[min(500px,80vw)] animate-float"
      transition:fly={{ y: -400, duration: 1500 }}
    />
  {/if}

  <div class="absolute top-0 right-0 m-5 z-[10] pointer-events-auto">
    <OnboardingWalletInfo />
  </div>

  {#if showWave}
    <img
      src="/home/wave.gif"
      alt="Waving Character"
      class="fixed bottom-[-100px] left-0 z-[3] h-[400px] w-auto"
      style="transform: rotate(10deg);"
      transition:fly={{ y: 300, duration: 1000 }}
    />
  {/if}

  <Button
    variant="red"
    size="lg"
    onclick={startGame}
    class="z-[3] text-3xl px-12 py-4 font-bold mb-8"
  >
    PLAY
  </Button>
</main>
