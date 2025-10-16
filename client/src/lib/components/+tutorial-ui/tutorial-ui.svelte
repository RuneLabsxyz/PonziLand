<script lang="ts">
  import { tutorialStore } from '$lib/stores/tutorial.store.svelte';
  import { tutorialLandStore } from '$lib/stores/tutorial-land.store.svelte';
  import TutorialDialogue from './widgets/tutorial-dialogue/widget-tutorial-dialogue.svelte';
  import TutorialWallet from './widgets/tutorial-wallet/widget-tutorial-wallet.svelte';
  import TutorialLandInfo from './widgets/tutorial-land-info/widget-tutorial-land-info.svelte';
  import TutorialProgress from './tutorial-progress.svelte';

  // Tutorial state
  let showDialogue = $derived(tutorialStore.currentDialogue !== null);
  let selectedLand = $derived(tutorialLandStore.selectedLand);
</script>

<div
  class="z-40 absolute top-0 left-0 right-0 bottom-0"
  style="pointer-events: none;"
>
  <!-- Tutorial Progress Bar -->
  <TutorialProgress />

  <!-- Tutorial Dialogue -->
  {#if showDialogue}
    <TutorialDialogue />
  {/if}

  <!-- Fixed Tutorial Widgets -->
  <div class="absolute top-4 right-4" style="pointer-events: auto;">
    <TutorialWallet />
  </div>

  <!-- Land Info Widget (shown when land is selected) -->
  {#if selectedLand}
    <div class="absolute left-4 top-20" style="pointer-events: auto;">
      <TutorialLandInfo land={selectedLand} />
    </div>
  {/if}

  <!-- Tutorial Controls -->
  <div
    class="absolute bottom-4 right-4 flex gap-2"
    style="pointer-events: auto;"
  >
    <button
      class="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors"
      onclick={() => tutorialStore.skipTutorial()}
    >
      Skip Tutorial
    </button>
  </div>
</div>
