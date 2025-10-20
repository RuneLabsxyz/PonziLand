<script lang="ts">
  import account from '$lib/account.svelte';
  import LandHudAuction from '$lib/components/+game-map/land/hud/land-hud-auction.svelte';
  import LandHudInfo from '$lib/components/+game-map/land/hud/land-hud-info.svelte';
  import LandNukeTime from '$lib/components/+game-map/land/land-nuke-time.svelte';
  import LandOwnerInfo from '$lib/components/+game-map/land/land-owner-info.svelte';
  import { Card } from '$lib/components/ui/card';
  import { selectedLandWithActions } from '$lib/stores/store.svelte';
  import { settingsStore } from '$lib/stores/settings.store.svelte';
  import { padAddress } from '$lib/utils';
  import { List, Eye } from 'lucide-svelte';
  import type { Snippet } from 'svelte';
  import { tutorialState } from '$lib/components/tutorial/stores.svelte';

  type Props = {
    setCustomTitle?: (title: Snippet<[]> | null) => void;
    setCustomControls?: (controls: Snippet<[]> | null) => void;
  };

  let { setCustomTitle, setCustomControls }: Props = $props();

  let highlighted = $derived(tutorialState.tutorialStep == 3);

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
    class="window-control"
    onclick={() => settingsStore.toggleNoobMode()}
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

{#if highlighted}
  <div class="spotlight-overlay"></div>
{/if}

<div class="content-wrapper" class:highlighted>
  {#if highlighted}
    <div class="spotlight-glow"></div>
  {/if}
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
    {#if land.type === 'auction'}
      <LandHudAuction {land} />
    {:else if land.type === 'grass'}
      <!-- <LandHudEmpty /> -->
    {:else}
      <LandHudInfo {land} {isOwner} showLand={true} />
    {/if}
  {/if}
</div>

<style>
  .spotlight-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.7);
    pointer-events: auto;
    z-index: 9998;
  }

  .content-wrapper {
    position: relative;
  }

  .content-wrapper.highlighted {
    position: relative;
    z-index: 9999;
    pointer-events: auto;
    overflow: visible;
  }

  .spotlight-glow {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 200%;
    height: 400%;
    background: radial-gradient(
      ellipse at center,
      rgba(255, 255, 255, 0.2) 0%,
      rgba(255, 255, 255, 0.12) 30%,
      rgba(255, 255, 255, 0.06) 50%,
      transparent 70%
    );
    pointer-events: none;
    z-index: -1;
    filter: blur(30px);
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 0.7;
      transform: translate(-50%, -50%) scale(1);
    }
    50% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1.1);
    }
  }
</style>
