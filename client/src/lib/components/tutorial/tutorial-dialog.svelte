<script lang="ts">
  import { Card } from '$lib/components/ui/card';
  import {
    tutorialState,
    nextStep,
    tutorialAttribute,
    resetExploredFields,
    resetExploredTaxFields,
    getExploredFieldsCount,
    TOTAL_EXPLORABLE_FIELDS,
  } from './stores.svelte';
  import dialogData from './dialog.json';
  import { onMount } from 'svelte';
  import { landStore, selectedLand } from '$lib/stores/store.svelte';
  import { settingsStore } from '$lib/stores/settings.store.svelte';
  import { ChevronRight } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';
  import { widgetsStore } from '$lib/stores/widgets.store';
  import { get } from 'svelte/store';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';

  let currentDialog = $derived(
    dialogData.steps[tutorialState.tutorialStep - 1],
  );

  // Fullscreen intro mode (step 1)
  let isFullscreenIntro = $derived(tutorialAttribute('fullscreen_intro').has);

  // Show "Enter the Grid" button at end
  let showEnterGrid = $derived(tutorialAttribute('enter_grid').has);

  // Click-to-continue mode for passive updates
  let waitLaziClick = $derived(tutorialAttribute('wait_lazi_click').has);

  function handleLaziClick() {
    if (waitLaziClick) {
      nextStep();
    }
  }

  // Total steps for progress indicator
  const totalSteps = dialogData.steps.length;

  // Track which spawning actions have been performed
  let hasSpawnedSecondAuction = $state(false);
  let hasSpawnedNeighbors = $state(false);
  let hasSpawnedFullAuction = $state(false);
  let hasConvertedAuction = $state(false);
  let autoAdvanceTimer: ReturnType<typeof setTimeout> | null = null;

  // Auto-advance effects based on wait_* attributes
  $effect(() => {
    // Wait for center land selection (first purchase)
    if (
      selectedLand.value?.location.x === 128 &&
      selectedLand.value?.location.y === 128 &&
      tutorialAttribute('wait_auction_click').has
    ) {
      nextStep();
    }

    // Wait for second auction selection - auto-convert if attribute is set
    if (
      selectedLand.value?.location.x === 127 &&
      selectedLand.value?.location.y === 127 &&
      tutorialAttribute('wait_second_auction_click').has
    ) {
      // If auto_convert_auction is set, convert the auction to a building (owned by someone else)
      if (
        tutorialAttribute('auto_convert_auction').has &&
        !hasConvertedAuction
      ) {
        hasConvertedAuction = true;
        landStore.convertTutorialAuctionToBuilding();
      }
      nextStep();
    }

    // Wait for player's land to be selected (for land info)
    if (
      selectedLand.value?.location.x === 128 &&
      selectedLand.value?.location.y === 128 &&
      selectedLand.value?.type === 'building' &&
      tutorialAttribute('wait_land_info_click').has
    ) {
      nextStep();
    }

    // Wait for full auction selection at (127, 128) - step 12
    if (
      selectedLand.value?.location.x === 127 &&
      selectedLand.value?.location.y === 128 &&
      tutorialAttribute('wait_select_land').has
    ) {
      nextStep();
    }

    // Legacy support for wait_auction_selected
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

  // Auto-advance effect for steps with auto_advance attribute
  $effect(() => {
    // Clear any existing timer when step changes
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer);
      autoAdvanceTimer = null;
    }

    // If current step has auto_advance, set a timer
    if (tutorialAttribute('auto_advance').has) {
      autoAdvanceTimer = setTimeout(() => {
        nextStep();
      }, 3000); // 3 second delay
    }

    return () => {
      if (autoAdvanceTimer) {
        clearTimeout(autoAdvanceTimer);
      }
    };
  });

  // Track explored fields for interactive_explore mode
  let exploredFieldsCount = $derived(getExploredFieldsCount());
  let hasAdvancedFromExplore = $state(false);

  // Advance when user has explored at least 3 fields during interactive_explore
  $effect(() => {
    if (
      tutorialAttribute('interactive_explore').has &&
      exploredFieldsCount >= 3 &&
      !hasAdvancedFromExplore
    ) {
      hasAdvancedFromExplore = true;
      // Give a moment to see the last tooltip, then advance
      setTimeout(() => nextStep(), 1500);
    }
  });

  // Progressive land spawning effects
  $effect(() => {
    // Spawn second auction when attribute is set
    if (
      tutorialAttribute('spawn_second_auction').has &&
      !hasSpawnedSecondAuction
    ) {
      hasSpawnedSecondAuction = true;
      landStore.addTutorialSecondAuction();
      // Auto-advance to next step after spawning
      setTimeout(() => nextStep(), 1500);
    }

    // Spawn neighbor lands when attribute is set
    if (tutorialAttribute('spawn_neighbors').has && !hasSpawnedNeighbors) {
      hasSpawnedNeighbors = true;
      landStore.addTutorialNeighbors();
    }

    // Spawn full auction when attribute is set
    if (tutorialAttribute('spawn_full_auction').has && !hasSpawnedFullAuction) {
      hasSpawnedFullAuction = true;
      landStore.addTutorialFullAuction();
      // Auto-advance to next step after spawning
      setTimeout(() => nextStep(), 1500);
    }
  });

  onMount(() => {
    widgetsStore.resetToDefault();
    widgetsStore.closeWidget('disclaimer');
    settingsStore.forceNoobMode();
    tutorialState.tutorialStep = 1;
    resetExploredFields();
    resetExploredTaxFields();
  });

  function enterGrid() {
    widgetsStore.resetToDefault();
    window.location.href = '/game';
  }
</script>

<!-- Fullscreen intro overlay -->
{#if isFullscreenIntro}
  <div
    class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80"
  >
    <Card class="max-w-2xl">
      <div class="flex flex-col items-center gap-6 p-8 font-ponzi-number">
        {#if currentDialog}
          <img
            src={`/tutorial/ponziworker_${currentDialog.image_id}.png`}
            alt="Lazi"
            class="w-48 h-48 object-contain"
          />
          <div class="text-xl leading-relaxed text-center">
            {@html currentDialog.text}
          </div>
        {/if}
      </div>
      <div class="flex justify-center px-8 pb-6">
        <Button onclick={nextStep} class="px-8 py-3 text-lg">
          Let's Go!
          <ChevronRight class="h-5 w-5 ml-2" />
        </Button>
      </div>
    </Card>
  </div>
{:else}
  <!-- Compact Lazi dialog - click to continue for passive updates -->
  <div class="fixed top-4 left-4 z-[9999]">
    <Card
      class="tutorial-card {waitLaziClick
        ? 'cursor-pointer hover:border-yellow-400'
        : ''}"
      onclick={handleLaziClick}
      role={waitLaziClick ? 'button' : undefined}
      tabindex={waitLaziClick ? 0 : undefined}
    >
      <div
        class="flex items-center gap-3 w-[480px] min-h-[120px] p-4 font-ponzi-number"
      >
        {#if currentDialog}
          <div class="w-24 flex-shrink-0">
            <img
              src={`/tutorial/ponziworker_${currentDialog.image_id}.png`}
              alt="Lazi"
              class="h-full w-full object-contain"
            />
          </div>
          <div class="flex-1 text-sm leading-relaxed">
            {@html currentDialog.text}
          </div>
        {/if}
      </div>

      <!-- Progress dots and action hint -->
      <div class="flex items-center justify-between px-4 pb-3">
        <!-- Progress dots -->
        <div class="flex gap-1">
          {#each Array(totalSteps) as _, i}
            <div
              class="w-2 h-2 rounded-full transition-all {i <
              tutorialState.tutorialStep
                ? 'bg-yellow-500'
                : i === tutorialState.tutorialStep - 1
                  ? 'bg-yellow-500 ring-2 ring-yellow-300'
                  : 'bg-gray-600'}"
            ></div>
          {/each}
        </div>

        <!-- Action hint or Enter Grid button -->
        {#if showEnterGrid}
          <Button onclick={enterGrid} size="sm" class="action-hint-button">
            Enter the Grid
            <ChevronRight class="h-4 w-4 ml-1" />
          </Button>
        {:else if currentDialog?.hint}
          <span class="text-xs text-gray-400 italic">
            {currentDialog.hint}
          </span>
        {/if}
      </div>
    </Card>
  </div>
{/if}

<style>
  :global(.tutorial-card) {
    border: 2px solid rgba(255, 215, 0, 0.3) !important;
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.1) !important;
  }

  :global(.action-hint-button) {
    animation: subtlePulse 2s ease-in-out infinite;
  }

  @keyframes subtlePulse {
    0%,
    100% {
      box-shadow: 0 0 4px rgba(255, 215, 0, 0.4);
    }
    50% {
      box-shadow: 0 0 12px rgba(255, 215, 0, 0.8);
    }
  }
</style>
