<script lang="ts">
  import { goto } from '$app/navigation';
  import {
    tutorialLandStore,
    tutorialProgression,
  } from '$lib/components/tutorial/stores.svelte';
  import Button from '$lib/components/ui/button/button.svelte';
  import { selectedLand } from '$lib/stores/store.svelte';
  import { onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import dialogData from '$lib/components/tutorial/dialog.json';
  import TypingEffect from '$lib/components/tutorial/typing-effect.svelte';
  import { Card } from '$lib/components/ui/card';

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

{#if currentDialog}
  <div class="flex gap-4 mt-6">
    <div class="h-36 w-36 flex-shrink-0">
      <img
        src={`/tutorial/ponziworker_${currentDialog.image_id}.png`}
        alt="Ponzi Worker"
        class="h-full w-full object-contain"
      />
    </div>
    <div class="text-white mt-4">
      <!-- {@html formatText(currentDialog.text)} -->
      <TypingEffect
        html={formatText(currentDialog.text)}
        speed={10}
        onComplete={() => console.log('Dialog complete!')}
      />
    </div>
  </div>
  <div class="w-full flex gap-6 items-center justify-center p-4">
    <Button size="md" onclick={previousStep}>prev.</Button>
    <div class="font-ponzi-number text-white">{step.value}/25</div>
    <Button size="md" onclick={nextStep}>next</Button>
  </div>
  <Button
    size="md"
    class="top-0 right-0 absolute m-2 bg-blue-500 text-white rounded "
    onclick={() => goto('/game')}
  >
    Skip Tutorial
  </Button>
{/if}
