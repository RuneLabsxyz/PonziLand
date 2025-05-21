<script lang="ts">
  import account from '$lib/account.svelte';
  import type { BaseLand } from '$lib/api/land';
  import { BuildingLand } from '$lib/api/land/building_land';
  import NukeExplosion from '$lib/components/ui/nuke-explosion.svelte';
  import LandDisplay from './land/land-display.svelte';
  import LandNukeAnimation from './land/land-nuke-animation.svelte';
  import LandNukeShield from './land/land-nuke-shield.svelte';
  import { Button } from '$lib/components/ui/button';
  import { GRID_SIZE, TILE_SIZE } from '$lib/const';
  import { cameraPosition, moveCameraTo } from '$lib/stores/camera.store';
  import { nukeStore } from '$lib/stores/nuke.store.svelte';
  import { cn, padAddress } from '$lib/utils';
  import type { Readable } from 'svelte/store';
  import { selectedLand, landStore as globalLandStore } from '$lib/stores/store.svelte';
  import { createLandWithActions } from '$lib/utils/land-actions';
  import { openLandInfoWidget } from '../+game-ui/game-ui.svelte';
  import RatesOverlay from './land/land-rates-overlay.svelte';
  import { AuctionLand } from '$lib/api/land/auction_land';
  import LandTaxClaimer from './land/land-tax-claimer.svelte';

  const SIZE = TILE_SIZE;

  const {
    land: landReadable,
    dragged,
    scale,
  }: { land: Readable<BaseLand>; dragged?: boolean; scale?: number } = $props();

  let land = $derived($landReadable);
  let address = $derived(account.address);

  let isOwner = $derived.by(() => {
    if (BuildingLand.is(land)) {
      return land?.owner === padAddress(address ?? '');
    }
  });

  let selected = $derived(selectedLand.value == land);

  let hovering = $state(false);

  // Determine which props to pass to LandSprite based on land type
  let spriteProps = $derived.by(() => {
    const baseProps = {
      config: {
        x: SIZE * land.location.x,
        y: SIZE * land.location.y,
        landCoordinates: { x: land.location.x, y: land.location.y },
        width: SIZE,
        height: SIZE,
      },
      seed: `${land.location.x},${land.location.y}`,
    };

    switch (land.type) {
      case 'empty':
        return { ...baseProps, grass: true };
      case 'auction':
        return { ...baseProps, auction: true };
      case 'building':
        if (BuildingLand.is(land)) {
          return {
            ...baseProps,
            token: land.token,
            level: land.level,
          };
        }
      default:
        return { ...baseProps, basic: true };
    }
  });

  let isNuking = $derived.by(() => {
    return nukeStore.nuking[land.location.x + land.location.y * GRID_SIZE];
  });

  // Get color based on land type and token
  let landColor = $derived.by(() => {
    switch (land.type) {
      case 'empty':
        return '#4CAF50'; // Green for empty/grass
      case 'auction':
        return '#FFC107'; // Yellow for auction
      case 'building':
        if (BuildingLand.is(land) && land.token) {
          // Use token's biome coordinates to determine color
          const { x, y } = land.token.images.biome;
          // Create a unique color based on biome coordinates
          const hue = (x * 31 + y * 17) % 360;
          return `hsl(${hue}, 70%, 50%)`;
        }
        return '#2196F3'; // Default blue for building without token
      default:
        return '#9E9E9E'; // Grey for basic
    }
  });

  let currentScale = $derived($cameraPosition.scale);

  function handleClick() {
    if (dragged) return;

    if (selected) {
      moveCameraTo(land.location.x + 1, land.location.y + 1);
    }

    selectedLand.value = land;
  }

  const handleLandInfoClick = () => {
    if (!BuildingLand.is(land)) return;

    const landWithActions = createLandWithActions(land, () => globalLandStore.getAllLands());
    openLandInfoWidget(landWithActions);
  };

  const handleBidClick = () => {
    if (!AuctionLand.is(land)) return;

    const landWithActions = createLandWithActions(land, () => globalLandStore.getAllLands());
    openLandInfoWidget(landWithActions);
  };

  let estimatedNukeTime = $derived.by(() => {
    if (!BuildingLand.is(land)) return -1;
    const estimatedNukeTime = 100000;
    if (!estimatedNukeTime) return -1;

    return estimatedNukeTime;
  });
</script>

<!-- {#if currentScale >= MIN_SCALE_FOR_DETAIL} -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore event_directive_deprecated -->
<!-- <div class="relative {selected ? 'selected' : ''}"> -->
<div
  onmouseup={handleClick}
  class={`relative tile`}
  style="--size: {SIZE}px;"
  onmouseover={() => (hovering = true)}
  onfocus={() => (hovering = true)}
  onmouseout={() => (hovering = false)}
  onblur={() => (hovering = false)}
>
  <LandDisplay {...spriteProps} {hovering} {selected} />
  {#if isNuking}
    {#if BuildingLand.is(land) && land.token}
      <NukeExplosion
        biomeX={land.token.images.biome.x}
        biomeY={land.token.images.biome.y}
        width={SIZE}
        height={SIZE}
      />
    {/if}
    <div class="absolute top-[-15%] right-0 w-full h-full z-20">
      <LandNukeAnimation />
    </div>
  {/if}

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
    {#if BuildingLand.is(land)}
      <RatesOverlay land={createLandWithActions(land, () => globalLandStore.getAllLands())} />
      {#if isOwner}
        <Button
          size="sm"
          class="absolute bottom-0 left-1/2 z-20"
          style="transform: translate(-50%, 0) scale(0.5)"
          onclick={handleLandInfoClick}
        >
          LAND INFO
        </Button>
      {:else}
        <Button
          size="sm"
          class="absolute bottom-0 left-1/2 z-20"
          style="transform: translate(-50%, 0) scale(0.5)"
          onclick={handleLandInfoClick}
        >
          BUY LAND
        </Button>
      {/if}
    {/if}
  {/if}

  {#if isOwner && !isNuking && BuildingLand.is(land)}
    <img
      src="/ui/icons/Icon_Crown.png"
      alt="owner"
      class="absolute z-20"
      style="top: -1.5px; width: 7px; height: 7px; image-rendering: pixelated; transform: rotate(-30deg); pointer-events: none;"
    />
    <div
      class={cn(
        'absolute top-0 left-1/2 -translate-x-1/2 z-20',
        (scale ?? 1) > 1.5 ? 'w-2 h-2' : 'w-6 h-6',
      )}
      onclick={handleClick}
    ></div>
  {/if}

  {#if BuildingLand.is(land) && !isNuking}
    <div class="absolute top-0 right-0 text-[4px]" onclick={handleClick}>
      {#if estimatedNukeTime == -1}
        inf.
      {:else}
        <LandNukeShield {estimatedNukeTime} />
      {/if}
    </div>
  {/if}

  {#if BuildingLand.is(land) && isOwner && land.type === 'building' && !isNuking}
    <div
      class="absolute z-20 top-1 left-1/2"
      style="transform: translate(-50%, -100%)"
    >
      <LandTaxClaimer land={createLandWithActions(land, () => globalLandStore.getAllLands())} />
    </div>
  {/if}
</div>

<!-- </div> -->
<!-- {:else}

  <div
    style="width: {SIZE}px; height: {SIZE}px; background-color: {landColor};"
  ></div>
{/if} -->

<style>
  .tile {
    width: var(--size);
    height: var(--size);
  }
</style>
