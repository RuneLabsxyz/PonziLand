<script lang="ts">
  import account from '$lib/account.svelte';
  import LandHudAuction from './fragments/land-hud-auction.svelte';
  import LandHudInfo from './fragments/land-hud-info.svelte';
  import LandNukeTime from '$lib/components/+game-map/land/land-nuke-time.svelte';
  import LandOwnerInfo from '$lib/components/+game-map/land/land-owner-info.svelte';
  import { Card } from '$lib/components/ui/card';
  import { selectedLandWithActions } from '$lib/stores/store.svelte';
  import { settingsStore } from '$lib/stores/settings.store.svelte';
  import { padAddress } from '$lib/utils';
  import { List, Eye } from 'lucide-svelte';
  import type { Snippet } from 'svelte';
  import {
    tutorialAttribute,
    tutorialState,
    nextStep,
  } from '$lib/components/tutorial/stores.svelte';

  type Props = {
    setCustomTitle?: (title: Snippet<[]> | null) => void;
    setCustomControls?: (controls: Snippet<[]> | null) => void;
  };

  let { setCustomTitle, setCustomControls }: Props = $props();

  let highlighted = $derived(tutorialAttribute('highlight_info').has);
  let highlightProMode = $derived(tutorialAttribute('highlight_pro_mode').has);
  let waitProModeClick = $derived(tutorialAttribute('wait_pro_mode_click').has);

  function handleProModeToggle() {
    settingsStore.toggleNoobMode();
    if (waitProModeClick) {
      nextStep();
    }
  }

  const address = $derived(account.address);
  let landWithActions = $derived(selectedLandWithActions());

  let isOwner = $derived(
    landWithActions?.value?.owner === padAddress(address ?? ''),
  );
  let land = $derived(landWithActions?.value);

  $effect(() => {
    if (setCustomTitle) {
      setCustomTitle(customTitleSnippet);
    }
  });

  $effect(() => {
    if (setCustomControls) {
      setCustomControls(customControlsSnippet);
    }
  });
</script>

{#snippet customTitleSnippet()}
  {land ? '' : 'Click on a land to see more info...'}
{/snippet}

{#snippet customControlsSnippet()}
  <button
    class="window-control {highlightProMode ? 'pro-mode-highlight' : ''}"
    onclick={handleProModeToggle}
    aria-label={settingsStore.isNoobMode
      ? 'Switch to Pro Mode'
      : 'Switch to Noob Mode'}
  >
    {#if settingsStore.isNoobMode}
      <Eye class="h-4 w-4" />
    {:else}
      <List class="h-4 w-4" />
    {/if}
  </button>
{/snippet}

{#if land}
  {#if land.type !== 'auction'}
    <div class="absolute left-0 top-0 -translate-y-full">
      <LandOwnerInfo {land} {isOwner} />
    </div>
    <div class="absolute right-0 top-0 -translate-y-full">
      <Card>
        <LandNukeTime {land} />
      </Card>
    </div>
  {/if}
{/if}
<div class="content-wrapper" class:highlighted>
  {#if land}
    {#if land.type === 'auction'}
      <LandHudAuction {land} />
    {:else if land.type === 'grass'}
      <!-- <LandHudEmpty /> -->
    {:else}
      <LandHudInfo
        {land}
        {isOwner}
        showLand={true}
        tutorialStep={tutorialState.tutorialStep}
      />
    {/if}
  {/if}
</div>

<style>
  .pro-mode-highlight {
    border: 2px solid #ffd700 !important;
    border-radius: 6px;
    animation: goldGlow 1.5s ease-in-out infinite;
  }

  .content-wrapper {
    position: relative;
  }

  .content-wrapper.highlighted {
    position: relative;
    z-index: 9999;
    pointer-events: auto;
    overflow: visible;
    border: 2px solid #ffd700;
    border-radius: 8px;
    animation: goldGlow 2s ease-in-out infinite;
  }

  @keyframes goldGlow {
    0%,
    100% {
      box-shadow:
        0 0 10px rgba(255, 215, 0, 0.4),
        0 0 20px rgba(255, 215, 0, 0.2);
    }
    50% {
      box-shadow:
        0 0 20px rgba(255, 215, 0, 0.8),
        0 0 40px rgba(255, 215, 0, 0.4);
    }
  }
</style>
