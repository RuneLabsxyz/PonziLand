<script lang="ts">
  import { Card } from '$lib/components/ui/card';
  import {
    tutorialState,
    nextStep,
    previousStep,
    tutorialAttribute,
    getExploredFieldsCount,
    TOTAL_EXPLORABLE_FIELDS,
    resetExploredFields,
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
    tutorialAttribute('previous').has ||
      tutorialAttribute('next').has ||
      tutorialAttribute('enter_grid').has,
  );

  // Interactive exploration state
  let isInteractiveMode = $derived(
    tutorialAttribute('interactive_explore').has,
  );
  let exploredCount = $derived(getExploredFieldsCount());
  let canSkipExploration = $state(false);

  // Timer for skip button
  let skipTimer: ReturnType<typeof setTimeout> | null = null;

  $effect(() => {
    if (isInteractiveMode) {
      // Allow skip after 15 seconds
      skipTimer = setTimeout(() => {
        canSkipExploration = true;
      }, 15000);
    } else {
      if (skipTimer) {
        clearTimeout(skipTimer);
        skipTimer = null;
      }
      canSkipExploration = false;
    }

    return () => {
      if (skipTimer) {
        clearTimeout(skipTimer);
      }
    };
  });

  let allFieldsExplored = $derived(exploredCount >= TOTAL_EXPLORABLE_FIELDS);

  $effect(() => {
    if (
      selectedLand.value?.location.x === 128 &&
      selectedLand.value?.location.y === 128 &&
      tutorialAttribute('wait_select_land').has
    ) {
      nextStep();
    }

    if (
      selectedLand.value?.location.x === 127 &&
      selectedLand.value?.location.y === 127 &&
      tutorialAttribute('wait_auction_selected').has
    ) {
      nextStep();
    }

    // Decrease stake for tutorial demonstration
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
    resetExploredFields();
  });

  function enterGrid() {
    widgetsStore.resetToDefault();
    window.location.href = '/game';
  }

  function skipExploration() {
    nextStep();
  }
</script>

<div class="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999]">
  <Card>
    <div
      class="flex items-center gap-4 w-[600px] min-h-[200px] p-6 font-ponzi-number"
    >
      {#if currentDialog}
        <div class="w-36 flex-shrink-0">
          <img
            src={`/tutorial/ponziworker_${currentDialog.image_id}.png`}
            alt="Ponzi Worker"
            class="h-full w-full object-contain"
          />
        </div>
        <div class="flex-1 text-base leading-relaxed">
          {@html currentDialog.text}
        </div>
      {/if}
    </div>

    <!-- Interactive exploration progress -->
    {#if isInteractiveMode}
      <div class="px-6 pb-2">
        <div class="flex items-center justify-between text-sm text-gray-400">
          <span
            >Fields explored: {exploredCount} / {TOTAL_EXPLORABLE_FIELDS}</span
          >
          <div class="flex gap-1">
            {#each Array(TOTAL_EXPLORABLE_FIELDS) as _, i}
              <div
                class="w-3 h-3 rounded-full {i < exploredCount
                  ? 'bg-green-500'
                  : 'bg-gray-600'}"
              ></div>
            {/each}
          </div>
        </div>
      </div>
      <div class="flex justify-center px-6 pb-4">
        <button
          onclick={skipExploration}
          class="flex items-center gap-2 px-4 py-2 rounded transition-colors text-sm {allFieldsExplored
            ? 'bg-gold-highlight'
            : 'bg-gray-700 hover:bg-gray-600'}"
          disabled={!canSkipExploration && !allFieldsExplored}
        >
          {allFieldsExplored ? 'Continue' : canSkipExploration ? 'Skip (I understand)' : 'Hover over each field...'}
          {#if allFieldsExplored}
            <ChevronRight class="h-4 w-4" />
          {/if}
        </button>
      </div>
    {:else if showNavigation}
      <div class="flex justify-between items-center px-6 pb-4">
        <button
          onclick={previousStep}
          class="flex items-center gap-1 px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 transition-colors text-sm"
          disabled={!tutorialAttribute('previous').has}
        >
          <ChevronLeft class="h-4 w-4" />
          Previous
        </button>
        {#if tutorialAttribute('enter_grid').has}
          <Button
            onclick={() => {
              enterGrid();
            }}
          >
            Enter the Grid
          </Button>
        {:else}
          <button
            onclick={nextStep}
            class="flex items-center gap-1 px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 transition-colors text-sm"
            disabled={!tutorialAttribute('next').has}
          >
            Next
            <ChevronRight class="h-4 w-4" />
          </button>
        {/if}
      </div>
    {:else if currentDialog?.continue != undefined}
      <div class="flex justify-end items-end px-6 pb-4">
        <button
          class="flex items-center gap-1 px-4 py-2 rounded bg-gray-700 transition-colors text-sm opacity-70"
          disabled
        >
          {currentDialog.continue}
        </button>
      </div>
    {/if}
  </Card>
</div>

<style>
  .bg-gold-highlight {
    background: linear-gradient(135deg, #ffd700, #ffaa00);
    color: black;
    font-weight: 600;
    animation: goldPulse 1.5s ease-in-out infinite;
  }

  .bg-gold-highlight:hover {
    background: linear-gradient(135deg, #ffe033, #ffbb33);
  }

  @keyframes goldPulse {
    0%, 100% {
      box-shadow: 0 0 8px rgba(255, 215, 0, 0.6);
    }
    50% {
      box-shadow: 0 0 16px rgba(255, 215, 0, 1);
    }
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  button:disabled:hover {
    background-color: rgb(55 65 81);
  }
</style>
