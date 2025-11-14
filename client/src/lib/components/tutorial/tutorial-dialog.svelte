<script lang="ts">
  import { Card } from '$lib/components/ui/card';
  import {
    tutorialState,
    nextStep,
    previousStep,
    tutorialAttribute,
  } from './stores.svelte';
  import dialogData from './dialog.json';
  import { onMount } from 'svelte';
  import { landStore, selectedLand } from '$lib/stores/store.svelte';
  import { settingsStore } from '$lib/stores/settings.store.svelte';
  import { ChevronLeft, ChevronRight } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';
  import { widgetsStore } from '$lib/stores/widgets.store';
  import { get } from 'svelte/store';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';

  let currentDialog = $derived(dialogData[tutorialState.tutorialStep - 1]);
  let showNavigation = $derived(
    tutorialAttribute('previous').has || tutorialAttribute('next').has,
  );

  $inspect(
    'navigation ==>',
    showNavigation,
    tutorialAttribute('previous').has,
    tutorialAttribute('next').has,
  );

  $effect(() => {
    if (
      selectedLand.value?.location.x === 128 &&
      selectedLand.value?.location.y === 128 &&
      tutorialAttribute('wait_select_land').has
    ) {
      nextStep();
    }

    // Also check if the wait_info_open attribute is present
    if (tutorialAttribute('decrease_stake').has) {
      let land = get(landStore.getLand(128, 128)!);
      // @ts-ignore This is really bad, but at least it works
      land._stakeAmount = CurrencyAmount.fromScaled(0.01, land.token);
      landStore.updateLandDirectly(128, 128, land);
    }
  });

  onMount(() => {
    widgetsStore.resetToDefault();
    widgetsStore.closeWidget('disclaimer');
    settingsStore.forceNoobMode();
    tutorialState.tutorialStep = 1;
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
        {#if tutorialAttribute('enter_grid').has}
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
          disabled={!tutorialAttribute('previous').has}
        >
          <ChevronLeft class="h-4 w-4" />
          Previous
        </button>
        <button
          onclick={nextStep}
          class="flex items-center gap-1 px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 transition-colors text-sm"
          disabled={!tutorialAttribute('next').has}
        >
          Next
          <ChevronRight class="h-4 w-4" />
        </button>
      </div>
    {:else if currentDialog.continue != undefined}
      <div class="flex justify-end items-end px-4 pb-4">
        <button
          class="flex items-center gap-1 px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 transition-colors text-sm"
          disabled
        >
          {currentDialog.continue}
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
