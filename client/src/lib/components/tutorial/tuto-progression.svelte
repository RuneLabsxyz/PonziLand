<script lang="ts">
  import {
    tutorialProgression,
    addAuctionToTiles,
    removeAuctionFromTiles,
    buyAuction,
  } from './stores';
  import { selectedLandPosition } from '$lib/stores/stores.svelte';
  import { toHexWithPadding } from '$lib/utils';
  import dialogData from './dialog.json';

  let currentDialog = $derived(dialogData[$tutorialProgression - 1]);

  function formatText(text: string) {
    return text.replace(/\n/g, '<br>');
  }

  function nextStep() {
    if ($tutorialProgression < 15) {
      tutorialProgression.set($tutorialProgression + 1);
    }
  }

  function previousStep() {
    if ($tutorialProgression > 1) {
      tutorialProgression.set($tutorialProgression - 1);
    }
  }

  // Tutorial progression handler:
  // This effect manages special tutorial elements based on the current step
  $effect(() => {
    if ($tutorialProgression === 3) {
      addAuctionToTiles();
    } else if ($tutorialProgression < 3) {
      removeAuctionFromTiles();
    }
    if ($tutorialProgression === 4) {
      // Select the auction tile at position [8][8]
      const auctionLocation = toHexWithPadding(8 * 16 + 8);
      selectedLandPosition.set(auctionLocation);
    }

    if ($tutorialProgression === 8) {
      buyAuction();
    }
  });
</script>

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
    Step {$tutorialProgression}/15
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
