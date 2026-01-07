<script lang="ts">
  import { devsettings } from '$lib/components/+game-map/three/utils/devsettings.store.svelte.js';
  import { HeatmapParameter } from '$lib/components/+game-ui/widgets/heatmap/heatmap.config';
  import Card from '$lib/components/ui/card/card.svelte';
  import { Separator } from '$lib/components/ui/separator';
  import * as ToggleGroup from '$lib/components/ui/toggle-group';
  import { heatmapStore } from '$lib/stores/heatmap.svelte';
  import { onMount } from 'svelte';
  import OverlayManagerItem from './OverlayManagerItem.svelte';
  import {
    tutorialAttribute,
    nextStep,
  } from '$lib/components/tutorial/stores.svelte';

  type MultipleValues = ('nuke' | 'rates')[];

  let multiple: MultipleValues = $state([]);

  // Tutorial state
  let highlightShieldButton = $derived(
    tutorialAttribute('highlight_shield_button').has,
  );
  let waitShieldClick = $derived(tutorialAttribute('wait_shield_click').has);

  // Keep the overlay visible during tutorial shield step
  let forceVisible = $derived(highlightShieldButton || waitShieldClick);

  onMount(() => {
    if (devsettings.showNukeTimes) multiple.push('nuke');
    if (devsettings.showRatesOverlay) multiple.push('rates');
  });

  $effect(() => {
    devsettings.showNukeTimes = multiple.includes('nuke');
    devsettings.showRatesOverlay = multiple.includes('rates');

    // Advance tutorial when shield is clicked
    if (waitShieldClick && multiple.includes('nuke')) {
      nextStep();
    }
  });

  type HeatmapState =
    | HeatmapParameter.SELL_PRICE
    | HeatmapParameter.STAKE_AMOUNT
    | HeatmapParameter.LEVEL
    | undefined;
  let heatmapState = $state<HeatmapState>();

  $effect(() => {
    if (heatmapState) {
      heatmapStore.setEnabled(true);
      heatmapStore.setParameter(heatmapState);
    } else {
      heatmapStore.setEnabled(false);
    }
  });
</script>

<div
  class="top-0 left-1/2 absolute z-2 pb-5 overlay-hover-detect {forceVisible
    ? 'force-visible'
    : ''}"
  style="pointer-events: all;"
>
  <Card class="bg-ponzi overlay-container relative">
    <div class="flex gap-2 -m-2">
      <!-- <Toggle variant="map" size="sm" class="rounded">
      <img
        src="/ui/icons/Icon_Book.png"
        alt="Settings"
        class="inline h-4 w-4"
      />
    </Toggle> -->
      <ToggleGroup.Root
        class="rounded-none"
        size="sm"
        variant="map"
        type="single"
        value={heatmapState}
        onValueChange={(e) => (heatmapState = e as HeatmapState)}
      >
        <OverlayManagerItem
          value={HeatmapParameter.SELL_PRICE}
          tooltip="Sell Price Heatmap"
        >
          <div class="font-ponzi-number text-xs stroke-3d-black">$</div>
        </OverlayManagerItem>
        <OverlayManagerItem
          value={HeatmapParameter.LEVEL}
          tooltip="Level Heatmap"
        >
          <div class="font-ponzi-number text-xs stroke-3d-black">lvl</div>
        </OverlayManagerItem>
        <OverlayManagerItem
          value={HeatmapParameter.STAKE_AMOUNT}
          tooltip="Stake Amount Heatmap"
        >
          <div class="font-ponzi-number text-xs stroke-3d-black">⟐</div>
        </OverlayManagerItem>
      </ToggleGroup.Root>
      <Separator orientation="vertical" class="my-2 opacity-50" />
      <ToggleGroup.Root
        size="sm"
        variant="map"
        class="rounded-none"
        type="multiple"
        value={multiple}
        onValueChange={(e) => (multiple = e as MultipleValues)}
      >
        <div class={highlightShieldButton ? 'tutorial-highlight' : ''}>
          <OverlayManagerItem value="nuke" tooltip="Show Nuke Times">
            <img
              src="/ui/icons/Icon_ShieldRed.png"
              alt="Stats Icon"
              class="inline h-4 w-4"
            />
          </OverlayManagerItem>
        </div>
        <OverlayManagerItem value="rates" tooltip="Show Rates Overlay">
          <img
            src="/ui/icons/Icon_Coin3.png"
            alt="Stats Icon"
            class="inline h-4 w-4"
          />
        </OverlayManagerItem>
      </ToggleGroup.Root>
    </div>
    <div
      class="absolute left-1/2 -translate-x-1/2 mt-3 rotate-180 leading-none h-1 chevron text-gray-200 font-ponzi-number text-2xl"
    >
      ^
    </div>
  </Card>
</div>

<style>
  :global(.overlay-container) {
    transform: translateY(-75%);
    transition: transform 0.2s ease-in-out;
  }
  .overlay-hover-detect {
    transform: translateX(-50%);
  }

  :global(.overlay-hover-detect:hover .overlay-container),
  :global(.force-visible .overlay-container) {
    transform: translateY(0);
  }

  .chevron {
    text-shadow:
      2px 2px 0 #000,
      -2px 2px 0 #000,
      2px -2px 0 #000,
      -2px -2px 0 #000,
      0 2px 0 #000,
      2px 0 0 #000,
      0 -2px 0 #000,
      -2px 0 0 #000;
  }

  .tutorial-highlight {
    border: 2px solid #ffd700;
    border-radius: 8px;
    animation: goldGlow 2s ease-in-out infinite;
  }

  @keyframes goldGlow {
    0%,
    100% {
      box-shadow:
        0 0 8px rgba(255, 215, 0, 0.4),
        0 0 16px rgba(255, 215, 0, 0.2);
    }
    50% {
      box-shadow:
        0 0 16px rgba(255, 215, 0, 0.8),
        0 0 32px rgba(255, 215, 0, 0.4);
    }
  }
</style>
