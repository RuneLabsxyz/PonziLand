<script lang="ts">
  import { uiStore } from '$lib/stores/ui.store.svelte';
  import account from '$lib/account.svelte';
  import { type LandWithActions } from '$lib/api/land.svelte';
  import type { Tile } from '$lib/api/tile-store.svelte';
  import { moveCameraToLocation } from '$lib/stores/camera';
  import { nukeStore } from '$lib/stores/nuke.svelte';
  import {
    selectedLand,
    selectedLandMeta,
    selectLand,
    selectedLandPosition,
  } from '$lib/stores/stores.svelte';
  import { cn, hexStringToNumber, padAddress } from '$lib/utils';
  import LandDisplay from '../land/land-display.svelte';
  import LandNukeAnimation from '../land/land-nuke-animation.svelte';
  import LandNukeShield from '../land/land-nuke-shield.svelte';
  import LandTaxClaimer from '../land/land-tax-claimer.svelte';
  import Button from '../ui/button/button.svelte';
  import RatesOverlay from './rates-overlay.svelte';
  import { onMount } from 'svelte';
  import { getAggregatedTaxes } from '$lib/utils/taxes';
  import NukeExplosion from '../animation/nuke-explosion.svelte';

  let {
    land,
    dragged,
    scale,
  }: { land: Tile; dragged: boolean; scale: number } = $props<{
    land: Tile;
    dragged: boolean;
    scale: number;
  }>();

  let address = $derived(account.address);
  let isNuking = $derived(nukeStore.nuking.has(land.location));

  let isOwner = $derived.by(() => {
    if (land.type === 'grass') return false;
    return land?.owner === padAddress(address ?? '');
  });

  let estimatedNukeTime = $derived.by(() => {
    if (land.type !== 'house') return -1;
    const estimatedNukeTime = land.getEstimatedNukeTime();
    if (!estimatedNukeTime) return -1;

    return estimatedNukeTime;
  });

  let selected = $derived($selectedLandPosition === land.location);

  let hovering = $state(false);

  function handleClick() {
    console.log('clicked', dragged);
    if (dragged) return;

    if ($selectedLand?.location == land.location) {
      moveCameraToLocation(Number(land.location));
    }

    selectLand(land as LandWithActions);
  }

  const handleBuyLandClick = () => {
    console.log('Buy land clicked');

    uiStore.showModal = true;
    uiStore.modalType = 'buy';
    uiStore.modalData = {
      location: hexStringToNumber($selectedLandMeta!.location),
      // TODO: Enforce null checks here
      sellPrice: $selectedLandMeta!.sellPrice ?? 0,
      tokenUsed: $selectedLandMeta!.tokenUsed ?? '',
      tokenAddress: $selectedLandMeta!.tokenAddress ?? '',
      owner: $selectedLandMeta!.owner || undefined,
    };
  };

  const handleBidClick = () => {
    console.log('Bid land clicked');

    uiStore.showModal = true;
    uiStore.modalType = 'bid';
  };

  async function setNukables() {
    if (land.type === 'house') {
      // TODO: Add an alternative indexer that calls the view function on the behalf of the user
      // to avoid destroying the RPC node.
      const aggregatedTaxes = await getAggregatedTaxes(land);
      const nukables = aggregatedTaxes.nukables;

      nukables.forEach((land) => {
        if (land.nukable) {
          // add to nukeStore.pending if not already in
          if (!nukeStore.pending.has(land.location)) {
            nukeStore.pending.set(land.location, true);
          }
        } else {
          // remove from nukeStore.pending if in
          if (nukeStore.pending.has(land.location)) {
            nukeStore.pending.delete(land.location);
          }
        }
      });
    }
  }

  $effect(() => {
    setNukables();
  });

  $effect(() => {
    if (nukeStore.nuking.has(land.location)) {
      setTimeout(() => {
        nukeStore.nuking.delete(land.location);
      }, 5000);
    }
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore event_directive_deprecated -->
<div class="relative {selected ? 'selected' : ''}">
  <div
    onmouseup={handleClick}
    class={`relative tile`}
    onmouseover={() => (hovering = true)}
    onfocus={() => (hovering = true)}
    onmouseout={() => (hovering = false)}
    onblur={() => (hovering = false)}
  >
    {#if isNuking || land.type == 'grass'}
      <LandDisplay grass road seed={land.location} {selected} {hovering} />
    {:else if land.type == 'auction'}
      <LandDisplay auction road {selected} {hovering} />
    {:else if land.type == 'house'}
      <LandDisplay
        token={land.token}
        level={land.level}
        road
        {selected}
        {hovering}
      />
    {/if}
  </div>

  {#if selected}
    {#if land.type === 'auction'}
      <Button
        size="sm"
        class="absolute bottom-0 left-1/2 z-20"
        style="transform: translate(-50%, 0) scale(0.5)"
        onclick={handleBidClick}
      >
        BID
      </Button>
    {/if}
    {#if land.type == 'house'}
      <RatesOverlay {land} />
      {#if isOwner}
        <Button
          size="sm"
          class="absolute bottom-0 left-1/2 z-20"
          style="transform: translate(-50%, 0) scale(0.5)"
          onclick={() => {
            uiStore.showModal = true;
            uiStore.modalType = 'land-info';
          }}
        >
          LAND INFO
        </Button>
      {:else}
        <Button
          size="sm"
          class="absolute bottom-0 left-1/2 z-20"
          style="transform: translate(-50%, 0) scale(0.5)"
          onclick={handleBuyLandClick}
        >
          BUY LAND
        </Button>
      {/if}
    {/if}
  {/if}

  {#if isOwner && scale > 1.5 && land.type === 'house'}
    <div
      class="absolute z-20 top-1 left-1/2"
      style="transform: translate(-50%, -100%)"
    >
      <LandTaxClaimer {land} />
    </div>
  {/if}

  {#if nukeStore.pending.has(land.location)}
    <div
      class="absolute bottom-1/4 left-1/2 -translate-x-1/2 text-ponzi animate-pulse text-[4px]"
      onclick={handleClick}
    >
      NUKABLE
    </div>
  {/if}

  {#if isNuking}
    {#if land.type == 'house' && land.token}
      <NukeExplosion
        biomeX={land.token.images.biome.x}
        biomeY={land.token.images.biome.y}
        width={32}
        height={32}
      />
    {/if}
    <div class="absolute top-0 right-0 w-full h-full z-20">
      <LandNukeAnimation />
    </div>
  {/if}

  {#if isOwner}
    <div
      class={cn(
        'absolute top-0 left-1/2 -translate-x-1/2 z-20',
        scale > 1.5 ? 'w-2 h-2' : 'w-6 h-6',
      )}
      style="background-image: url('/ui/icons/Icon_Crown.png'); background-size: contain; background-repeat: no-repeat;"
      onclick={handleClick}
    ></div>
  {/if}
  {#if land.type == 'house'}
    <div class="absolute top-0 right-0 text-[4px]" onclick={handleClick}>
      {#if estimatedNukeTime == -1}
        inf.
      {:else}
        <LandNukeShield {estimatedNukeTime} />
      {/if}
    </div>
  {/if}
</div>

<style>
  .tile {
    width: 32px;
    height: 32px;
  }

  .selected {
    z-index: 30;
  }
</style>
