<script lang="ts">
  import { tutorialProgression, tileState } from './stores.svelte';
  import { selectedLandPosition } from '$lib/stores/stores.svelte';
  import { toHexWithPadding } from '$lib/utils';
  import dialogData from './dialog.json';
  import { countOffset } from '@tsparticles/engine';

  const step = tutorialProgression();

  let currentDialog = $derived(dialogData[step.value - 1]);

  // Active image is the state that controls which image is displayed
  // during the tutorial. It is set to an empty string when no image is displayed.
  // The images are loaded from the /tutorial/ui/ directory.
  // The images are named according to the activeImage variable.
  let activeImage = $state('');

  function formatText(text: string) {
    return text.replaceAll('\n', '<br>');
  }

  function nextStep() {
    if (step.value < 15) {
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
  }
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
>
  {#if activeImage !== ''}
    <img
      src={`/tutorial/ui/${activeImage}.png`}
      alt={`Tutorial ${activeImage} interface`}
      class="max-w-[80vw] max-h-[80vh]"
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
>
  <img
    src="/tutorial/Ponzi_Arrow.png"
    alt="Ponzi Arrow"
    class="h-auto w-[60px] -scale-x-100"
  />
  <span class="mt-1 text-sm font-bold text-white text-ponzi">Next</span>
</button>

<div
  class="fixed bottom-16 left-0 right-0 mx-auto z-[9999] flex w-fit flex-col items-center pointer-events-none"
>
  <span class="text-2xl font-bold text-white text-ponzi">
    Step {step.value}/15
  </span>
</div>

<button
  class="fixed bottom-8 left-24 z-[9999] flex flex-col items-center cursor-pointer"
  onclick={previousStep}
  tabindex="0"
>
  <img
    src="/tutorial/Ponzi_Arrow.png"
    alt="Ponzi Arrow"
    class="h-auto w-[60px]"
  />
  <span class="mt-1 text-sm font-bold text-white text-ponzi">Previous</span>
</button>
