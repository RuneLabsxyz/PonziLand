<script lang="ts">
  import { Card } from '$lib/components/ui/card';
  import { tutorialState, nextStep, previousStep } from './stores.svelte';
  import dialogData from './dialog.json';
  import { onMount } from 'svelte';
  import { selectedLand } from '$lib/stores/store.svelte';
  import { settingsStore } from '$lib/stores/settings.store.svelte';
  import { ChevronLeft, ChevronRight } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';
  import { widgetsStore } from '$lib/stores/widgets.store';

  let currentDialog = $derived(dialogData[tutorialState.tutorialStep - 1]);
  let showNavigation = $derived(
    tutorialState.tutorialStep >= 3 && tutorialState.tutorialStep <= 7,
  );

  $effect(() => {
    if (
      selectedLand.value?.location.x === 128 &&
      selectedLand.value?.location.y === 128 &&
      tutorialState.tutorialStep === 2
    ) {
      nextStep();
    }
  });

  onMount(() => {
    widgetsStore.resetToDefault();
    widgetsStore.closeWidget('disclaimer');
    settingsStore.toggleNoobMode();
    tutorialState.tutorialStep = 1;
    setTimeout(() => {
      nextStep();
    }, 5000);
  });

  function enterGrid() {
    widgetsStore.resetToDefault();
    window.location.href = '/game';
  }
</script>

<div class="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
  <Card>
    <div
      class="flex items-center gap-2 w-[400px] h-[200px] p-4 font-ponzi-number"
    >
      {#if currentDialog}
        <div class="w-32 flex-shrink-0">
          <img
            src={`/tutorial/ponziworker_${currentDialog.image_id}.png`}
            alt="Ponzi Worker"
            class="h-full w-full object-contain"
          />
        </div>
        <div class="flex-1 text-sm">
          {@html currentDialog.text}
        </div>
        {#if tutorialState.tutorialStep === 10}
          <Button
            onclick={() => {
              enterGrid();
            }}
          >
            Enter the Grid
          </Button>
        {/if}
      {/if}
    </div>
    {#if showNavigation}
      <div class="flex justify-between items-center px-4 pb-4">
        <button
          onclick={previousStep}
          class="flex items-center gap-1 px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 transition-colors text-sm"
          disabled={tutorialState.tutorialStep === 4}
        >
          <ChevronLeft class="h-4 w-4" />
          Previous
        </button>
        <button
          onclick={nextStep}
          class="flex items-center gap-1 px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 transition-colors text-sm"
          disabled={tutorialState.tutorialStep === 8}
        >
          Next
          <ChevronRight class="h-4 w-4" />
        </button>
      </div>
    {/if}
  </Card>
</div>

<style>
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  button:disabled:hover {
    background-color: rgb(55 65 81);
  }
</style>
