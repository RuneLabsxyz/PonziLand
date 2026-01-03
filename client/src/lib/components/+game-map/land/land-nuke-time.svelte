<script lang="ts">
  import type { LandWithActions } from '$lib/api/land';
  import {
    tutorialAttribute,
    markFieldExplored,
    isFieldExplored,
    TUTORIAL_FIELD_DESCRIPTIONS,
  } from '$lib/components/tutorial/stores.svelte';
  import { Card } from '$lib/components/ui/card';
  import { estimateNukeTimeRpc } from '$lib/utils/taxes';
  import { parseNukeTime } from '$lib/utils/date';

  let {
    land,
  }: {
    land?: LandWithActions;
  } = $props();

  let nukeTime = $state<string | undefined>(undefined);
  let showTooltip = $state(false);
  let isInteractiveMode = $derived(
    tutorialAttribute('interactive_explore').has,
  );

  $effect(() => {
    const calculateNukeTime = async () => {
      if (land === undefined) {
        nukeTime = undefined;
        return;
      }

      const timeInSeconds = await estimateNukeTimeRpc(land);
      nukeTime = parseNukeTime(timeInSeconds);
    };
    calculateNukeTime();
  });

  function formatNukeTime(nukeTime: string | undefined) {
    if (land?.getNeighbors().getBaseLandsArray().length == 0) return 'inf';
    return nukeTime === '' ? 'NUKABLE!' : nukeTime;
  }

  function handleHover() {
    if (isInteractiveMode) {
      showTooltip = true;
      markFieldExplored('nuke');
    }
  }

  function handleLeave() {
    showTooltip = false;
  }
</script>

<div
  class={[
    'flex items-center gap-2 text-ponzi-number text-red-500 relative',
    tutorialAttribute('highlight_info_nuke').has ? 'tutorial-highlight' : '',
    isInteractiveMode ? 'tutorial-explorable' : '',
    isInteractiveMode && isFieldExplored('nuke') ? 'explored' : '',
  ]}
  onmouseenter={handleHover}
  onmouseleave={handleLeave}
  role="button"
  tabindex="0"
>
  {#if showTooltip && isInteractiveMode}
    <div class="tutorial-tooltip">
      {TUTORIAL_FIELD_DESCRIPTIONS['nuke']}
    </div>
  {/if}
  <img src="/extra/nuke.png" alt="Nuke Symbol" class="h-6 w-6" />
  <span>{formatNukeTime(nukeTime)}</span>
</div>

<style>
  .text-ponzi-number {
    font-family: 'PonziNumber', sans-serif;
  }

  .tutorial-highlight {
    border: 2px solid #ffd700;
    border-radius: 8px;
    padding: 0.5rem;
    animation: goldGlow 2s ease-in-out infinite;
  }

  .tutorial-explorable {
    cursor: pointer;
    border: 2px solid transparent;
    border-radius: 8px;
    padding: 0.5rem;
    transition: all 0.2s ease;
  }

  .tutorial-explorable:hover {
    border-color: #ffd700;
    background: rgba(255, 215, 0, 0.1);
  }


  .tutorial-tooltip {
    position: absolute;
    bottom: 100%;
    right: 0;
    background: rgba(0, 0, 0, 0.95);
    color: white;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    font-size: 1rem;
    font-family: sans-serif;
    max-width: 400px;
    min-width: 280px;
    text-align: center;
    z-index: 9999;
    border: 2px solid #ffd700;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    margin-bottom: 8px;
    white-space: normal;
    line-height: 1.4;
  }

  .tutorial-tooltip::after {
    content: '';
    position: absolute;
    top: 100%;
    right: 20px;
    border-left: 8px solid transparent;
    border-right: 8px solid transparent;
    border-top: 8px solid #ffd700;
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
