<script lang="ts">
  import { tutorialProgression, tileState } from './stores.svelte';
  import { selectedLandPosition } from '$lib/stores/stores.svelte';
  import { toHexWithPadding } from '$lib/utils';
  import dialogData from './dialog.json';
  import { fly } from 'svelte/transition';
  import Button from '../ui/button/button.svelte';
  import { goto } from '$app/navigation';

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
      tileState.addAuction();
    } else if (step.value < 3) {
      tileState.removeAuction();
    }
    if (step.value === 4) {
      // Select the auction tile at position [8][8]
      const auctionLocation = toHexWithPadding(8 * 16 + 8);
      selectedLandPosition.set(auctionLocation);
    }
    if (step.value === 5) {
      activeImage = 'auction';
    } else if (step.value === 6) {
      activeImage = 'buy-auction';
    } else {
      activeImage = '';
    }

    if (step.value === 8) {
      tileState.buyAuction();
    }
    if (step.value === 9) {
      tileState.levelUp(8, 8);
    }
    if (step.value === 10) {
      tileState.levelUp(8, 8);
    }
    if (step.value === 11) {
      tileState.addAuction(7, 8);
      tileState.addAuction(9, 8);
      tileState.addAuction(9, 9);
    } else if (step.value <= 11) {
      tileState.removeAuction(7, 8);
      tileState.removeAuction(9, 8);
      tileState.removeAuction(9, 9);
      tileState.setDisplayRates(false);
    }
    if (step.value === 12) {
      tileState.buyAuction(7, 8, 1);
      tileState.buyAuction(9, 8, 2);
      tileState.buyAuction(9, 9, 3);
      tileState.setDisplayRates(true);
    }
    if (step.value >= 13) {
      tileState.setDisplayRates(false);
      startAutoDecreaseNukeTime();
    }
  }

  function startAutoDecreaseNukeTime() {
    isCountdownActive = true;
    vignette = 0;

    flashOpacity = 0.7;
    const startTime = Date.now();
    const fadeOutDuration = 1000;

    const fadeOutInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= fadeOutDuration) {
        clearInterval(fadeOutInterval);
        flashOpacity = 0;
        return;
      }
      flashOpacity = 0.7 * (1 - elapsed / fadeOutDuration);
    }, 16);

    const vignetteInterval = setInterval(() => {
      vignette += 0.05;
    }, 50);

    const nukeInterval = setInterval(() => {
      tileState.reduceTimeToNuke(8, 8);
      step.increment();

      if (tileState.getNukeTime(8, 8) <= 80000) {
        clearInterval(nukeInterval);
        clearInterval(vignetteInterval);

        tileState.setNuke(true);
        setTimeout(() => {
          tileState.removeAuction(8, 8);
        }, 1000);
        ponziMaster = true;
      }
    }, 4000);
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
  <span class="mt-1 text-sm font-bold text-white text-ponzi">Next</span>
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
  <span class="mt-1 text-sm font-bold text-white text-ponzi">Previous</span>
</button>
{#if ponziMaster}
  <div class="fixed inset-0 z-[998] flex justify-evenly items-center">
    <div
      class="w-[500px] text-center text-ponzi-number text-white text-4xl font-bold leading-relaxed"
      transition:fly={{ x: -1000, duration: 1000, delay: 1000 }}
    >
      HAHAHAHAHA
      <br />
      THis is what the PONZI LAND is about.
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
