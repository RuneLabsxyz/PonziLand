<script lang="ts">
  import { goto } from '$app/navigation';
  import Button from '$lib/components/ui/button/button.svelte';
  import { selectedLand } from '$lib/stores/store.svelte';
  import { onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import { fly } from 'svelte/transition';
  import dialogData from './dialog.json';
  import { tutorialLandStore, tutorialProgression } from './stores.svelte';

  const step = tutorialProgression();

  let currentDialog = $derived(dialogData[step.value - 1]);

  // Active image is the state that controls which image is displayed
  // during the tutorial. It is set to an empty string when no image is displayed.
  // The images are loaded from the /tutorial/ui/ directory.
  // The images are named according to the activeImage variable.
  let activeImage = $state('');

  let isCountdownActive = $state(false);

  let vignette = $state(0);

  let ponziMaster = $state(false);

  let flashOpacity = $state(0);

  let fadeOutInterval = $state<NodeJS.Timeout | undefined>(undefined);
  let vignetteInterval = $state<NodeJS.Timeout | undefined>(undefined);
  let nukeInterval = $state<NodeJS.Timeout | undefined>(undefined);

  onDestroy(() => {
    if (fadeOutInterval) clearInterval(fadeOutInterval);
    if (vignetteInterval) clearInterval(vignetteInterval);
    if (nukeInterval) clearInterval(nukeInterval);
  });

  function formatText(text: string) {
    return text.replaceAll('\n', '<br>');
  }

  function nextStep() {
    if (step.value < 25) {
      step.increment();
      changeMap();
    }
  }

  function previousStep() {
    if (step.value > 1) {
      step.decrement();
      changeMap();
    }
  }

  // Tutorial progression handler:
  function changeMap() {
    if (step.value === 3) {
      tutorialLandStore.addAuction();
    } else if (step.value < 3) {
      tutorialLandStore.removeAuction();
    }
    if (step.value === 4) {
      // Select the auction tile at position [32][32]
      const landStore = tutorialLandStore.getLand(32, 32);
      if (landStore) {
        const land = get(landStore);
        selectedLand.value = land;
      }
    }
    if (step.value === 5) {
      activeImage = 'auction';
    } else if (step.value === 6) {
      activeImage = 'buy-auction';
    } else {
      activeImage = '';
    }

    if (step.value === 8) {
      tutorialLandStore.buyAuction(32, 32);
    }
    if (step.value === 9) {
      tutorialLandStore.levelUp(32, 32);
    }
    if (step.value === 10) {
      tutorialLandStore.levelUp(32, 32);
    }
    if (step.value === 11) {
      tutorialLandStore.addAuction(31, 32);
      tutorialLandStore.addAuction(33, 32);
      tutorialLandStore.addAuction(33, 33);
    } else if (step.value <= 11) {
      tutorialLandStore.removeAuction(31, 32);
      tutorialLandStore.removeAuction(33, 32);
      tutorialLandStore.removeAuction(33, 33);
      tutorialLandStore.setDisplayRates(false);
    }
    if (step.value === 12) {
      tutorialLandStore.buyAuction(31, 32, 1);
      tutorialLandStore.buyAuction(33, 32, 2);
      tutorialLandStore.buyAuction(33, 33, 3);
      tutorialLandStore.setDisplayRates(true);
    }
    if (step.value >= 13) {
      tutorialLandStore.setDisplayRates(false);
      startAutoDecreaseNukeTime();
    }
  }

  function startAutoDecreaseNukeTime() {
    isCountdownActive = true;
    vignette = 0;

    flashOpacity = 0.7;
    const startTime = Date.now();
    const fadeOutDuration = 1000;

    fadeOutInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= fadeOutDuration) {
        if (fadeOutInterval) clearInterval(fadeOutInterval);
        fadeOutInterval = undefined;
        flashOpacity = 0;
        return;
      }
      flashOpacity = 0.7 * (1 - elapsed / fadeOutDuration);
    }, 16);

    vignetteInterval = setInterval(() => {
      vignette += 0.02;
    }, 100);

    nukeInterval = setInterval(() => {
      tutorialLandStore.reduceTimeToNuke(32, 32);
      step.increment();

      if (tutorialLandStore.getNukeTime(32, 32) <= 20000) {
        if (nukeInterval) clearInterval(nukeInterval);
        if (vignetteInterval) clearInterval(vignetteInterval);
        nukeInterval = undefined;
        vignetteInterval = undefined;

        tutorialLandStore.setNuke(true);
        setTimeout(() => {
          tutorialLandStore.removeAuction(32, 32);
          tutorialLandStore.startRandomUpdates();
        }, 1000);
        ponziMaster = true;
      }
    }, 1000);
  }
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
>
  {#if activeImage !== ''}
    <img
      src={`/tutorial/ui/${activeImage}.png`}
      alt={`Tutorial ${activeImage} interface`}
      class="max-w-[80vw] max-h-[50vh] pt-10"
    />
  {/if}
</div>

<div
  class="fixed left-0 right-0 top-8 mx-auto z-[9999] flex w-fit max-w-2xl items-center gap-4"
>
  {#if currentDialog}
    <div class="h-24 w-24 flex-shrink-0 mt-4">
      <img
        src={`/tutorial/ponziworker_${currentDialog.image_id}.png`}
        alt="Ponzi Worker"
        class="h-full w-full object-contain"
        style="transform: scale(1.5);"
      />
    </div>
    <div class="flex flex-col items-end">
      <div
        class="relative flex h-[180px] w-[600px] items-center justify-center text-ponzi text-stroke-0 text-stroke-none"
        style="background-image: url('/ui/ramp/chat-box.png'); background-size: cover;"
      >
        <div class="mx-14 p-4 text-left text-black" style="width: 550px;">
          <div class="relative text-md">
            <span class="block" style="white-space: pre-line;"
              >{@html formatText(currentDialog.text)}</span
            >
          </div>
        </div>
      </div>
      <Button
        class="top-0 right-0 m-2 mr-6 bg-blue-500 text-white rounded "
        onclick={() => goto('/game')}
      >
        Skip Tutorial
      </Button>
    </div>
  {/if}
</div>

<button
  class="fixed bottom-8 right-24 z-[9999] flex flex-col items-center cursor-pointer"
  onclick={nextStep}
  tabindex="0"
  disabled={isCountdownActive}
>
  <div class="relative">
    {#if isCountdownActive}
      <div
        class="absolute z-50 text-5xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      >
        ❌
      </div>
    {/if}
    <img
      src="/tutorial/Ponzi_Arrow.png"
      alt="Ponzi Arrow"
      class="h-auto w-[60px] -scale-x-100"
    />
  </div>
  <span class="mt-1 font-bold text-white text-ponzi">Next</span>
</button>

<div
  class="fixed bottom-16 left-0 right-0 mx-auto z-[9999] flex w-fit flex-col items-center pointer-events-none"
>
  <span class="text-2xl font-bold text-white text-ponzi">
    Step {step.value}/25
  </span>
</div>
<button
  class="fixed bottom-8 left-24 z-[9999] flex flex-col items-center cursor-pointer"
  onclick={previousStep}
  tabindex="0"
  disabled={isCountdownActive}
>
  <div class="relative">
    {#if isCountdownActive}
      <div
        class="absolute text-5xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      >
        ❌
      </div>
    {/if}
    <img
      src="/tutorial/Ponzi_Arrow.png"
      alt="Ponzi Arrow"
      class="h-auto w-[60px]"
    />
  </div>
  <span class="mt-1 font-bold text-white text-ponzi">Previous</span>
</button>
{#if ponziMaster}
  <div class="fixed inset-0 z-[998] flex justify-evenly items-center">
    <div
      class="w-[500px] text-center text-ponzi-number text-white text-4xl font-bold leading-relaxed"
      transition:fly={{ x: -1000, duration: 1000, delay: 1000 }}
    >
      HAHAHAHAHA
      <br />
      This is what the PONZI LAND is about.
      <br />
      Fight or Die.
      <br />
      Welcome to the arena
    </div>

    <div
      class="w-[500px] flex flex-col items-center justify-center gap-4"
      transition:fly={{ y: 1000, duration: 1000, delay: 2000 }}
    >
      <img src="/logo.png" alt="Logo" class="h-auto w-full" />
      <Button onclick={() => goto('/game')}>Start Game</Button>
    </div>

    <img
      src="/tutorial/PONZIMASTER.png"
      alt="Ponzi master"
      class="h-auto w-[500px]"
      transition:fly={{ x: 1000, duration: 1000, delay: 1000 }}
    />
  </div>
{/if}
{#if vignette > 0}
  <div
    class="fixed inset-0 pointer-events-none z-[9998]"
    style="box-shadow: inset 0 0 {vignette * 100}px rgba(0,0,0,{vignette})"
  ></div>
{/if}
{#if flashOpacity > 0}
  <div
    class="fixed inset-0 pointer-events-none z-[9999] bg-white"
    style="opacity: {flashOpacity}; transition: opacity 100ms ease-in, opacity 1000ms ease-out"
  ></div>
{/if}

<style>
  .text-ponzi-number {
    font-family: 'PonziNumber', sans-serif;
  }
</style>
