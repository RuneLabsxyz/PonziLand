<script lang="ts">
  import account from '$lib/account.svelte';
  import type { BaseLand } from '$lib/api/land';
  import { AuctionLand } from '$lib/api/land/auction_land';
  import { BuildingLand } from '$lib/api/land/building_land';
  import { Button } from '$lib/components/ui/button';
  import NukeExplosion from '$lib/components/ui/nuke-explosion.svelte';
  import { GRID_SIZE, MIN_SCALE_FOR_DETAIL, TILE_SIZE } from '$lib/const';
  import { cameraPosition, moveCameraTo } from '$lib/stores/camera.store';
  import { nukeStore } from '$lib/stores/nuke.store.svelte';
  import { gameSounds } from '$lib/stores/sfx.svelte';
  import {
    landStore as globalLandStore,
    highlightedLands,
    selectedLand,
  } from '$lib/stores/store.svelte';
  import { cn, padAddress } from '$lib/utils';
  import { createLandWithActions } from '$lib/utils/land-actions';
  import data from '$profileData';
  import type { Readable } from 'svelte/store';
  import { openLandInfoWidget } from '../+game-ui/game-ui.svelte';
  import { tutorialLandStore, tutorialState } from '../tutorial/stores.svelte';
  import LandDisplay from './land/land-display.svelte';
  import LandNukeAnimation from './land/land-nuke-animation.svelte';
  import LandNukeShield from './land/land-nuke-shield.svelte';
  import RatesOverlay from './land/land-rates-overlay.svelte';
  import LandTaxClaimer from './land/land-tax-claimer.svelte';

  const SIZE = TILE_SIZE;

  const {
    land: landReadable,
    dragged,
    scale,
  }: { land: Readable<BaseLand>; dragged?: boolean; scale?: number } = $props();

  let land = $derived($landReadable);
  let address = $derived(account.address);
  let isHighlighted = $derived(
    highlightedLands.value.includes(land.locationString),
  );

  let isOwner = $derived.by(() => {
    if (BuildingLand.is(land)) {
      return land?.owner === padAddress(address ?? '');
    }
  });

  let aiAgent = $derived.by(() => {
    if (BuildingLand.is(land)) {
      return data.aiAgents.find(
        (agent) => padAddress(agent.address) === padAddress(land.owner),
      );
    }
    return null;
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

    if (land.type !== 'empty' && selectedLand.value != land)
      gameSounds.play('biomeSelect');

    selectedLand.value = land;
  }

  const handleLandInfoClick = () => {
    if (!BuildingLand.is(land)) return;

    const landWithActions = createLandWithActions(land, () => {
      if (tutorialState.tutorialEnabled) return tutorialLandStore.getAllLands();
      return globalLandStore.getAllLands();
    });

    console.log('land', land);
    console.log('landWithActions', landWithActions);
    openLandInfoWidget(landWithActions);
  };

  const handleBidClick = () => {
    if (!AuctionLand.is(land)) return;

    const landWithActions = createLandWithActions(land, () => {
      if (tutorialState.tutorialEnabled) return tutorialLandStore.getAllLands();

      return globalLandStore.getAllLands();
    });

    console.log('land', land);
    console.log('landWithActions', landWithActions);
    openLandInfoWidget(landWithActions);
  };

  let estimatedNukeTime = $state(-1);
  $effect(() => {
    const loadNukeTime = async () => {
      if (!BuildingLand.is(land)) return;

      const landWithActions = createLandWithActions(land, () =>
        globalLandStore.getAllLands(),
      );

      try {
        estimatedNukeTime = tutorialState.tutorialEnabled
          ? tutorialLandStore.getEstimatedNukeTime(landWithActions)
          : await landWithActions.getEstimatedNukeTime();
      } catch (error) {
        console.error('Error loading nuke time:', error);
        estimatedNukeTime = -1;
      }
    };

    loadNukeTime();
  });

  const onFocus = () => {
    hovering = true;
    // if (land.type !== 'empty') {
    //   hover_sound.play();
    // }
  };

  const onBlur = () => {
    hovering = false;
  };
</script>

<!-- {#if currentScale >= MIN_SCALE_FOR_DETAIL} -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore event_directive_deprecated -->
<!-- <div class="relative {selected ? 'selected' : ''}"> -->
<div
  onmouseup={handleClick}
  class={`relative tile ${hovering || selected ? 'z-30' : ''}`}
  style="--size: {SIZE}px;"
  onmouseover={onFocus}
  onfocus={onFocus}
  onmouseout={onBlur}
  onblur={onBlur}
>
  <LandDisplay
    {...spriteProps}
    {hovering}
    {selected}
    highlighted={isHighlighted}
  />

  {#if currentScale < MIN_SCALE_FOR_DETAIL && isOwner}
    <div class="tile-overlay pointer-events-none building-overlay"></div>
  {/if}
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
        size="grid"
        class="absolute bottom-0 left-1/2 z-20"
        style="transform: translate(-50%, 25%) scale(0.5)"
        onclick={handleBidClick}
      >
        BUY LAND
      </Button>
    {/if}
    {#if BuildingLand.is(land)}
      <RatesOverlay
        land={createLandWithActions(land, () => globalLandStore.getAllLands())}
      />
      {#if isOwner}
        <Button
          size="grid"
          class="absolute bottom-0 left-1/2 z-20"
          style="transform: translate(-50%, 25%) scale(0.5)"
          onclick={handleLandInfoClick}
        >
          LAND INFO
        </Button>
      {:else}
        <Button
          size="grid"
          class="absolute bottom-0 left-1/2 z-20"
          style="transform: translate(-50%, 25%) scale(0.5)"
          onclick={handleLandInfoClick}
        >
          BUY LAND
        </Button>
      {/if}
    {/if}
  {/if}

  {#if isOwner && !isNuking && BuildingLand.is(land) && currentScale >= MIN_SCALE_FOR_DETAIL}
    <img
      src="/ui/icons/Icon_Crown.png"
      alt="owner"
      class="absolute z-20"
      style="top: -12px; width: 56px; height: 56px; image-rendering: pixelated; transform: rotate(-30deg); pointer-events: none;"
    />
    <div
      class={cn(
        'absolute top-0 left-1/2 -translate-x-1/2 z-20',
        (scale ?? 1) > 1.5 ? 'w-16 h-16' : 'w-48 h-48',
      )}
      onclick={handleClick}
    ></div>
  {:else if aiAgent && !isNuking && BuildingLand.is(land)}
    <img
      src={aiAgent.badgeImage}
      alt={aiAgent.name}
      class="absolute z-20"
      style="top: -12px; width: 56px; height: 56px; image-rendering: pixelated; pointer-events: none;"
    />
  {/if}

  {#if BuildingLand.is(land) && !isNuking}
    <div
      class={cn(
        'absolute z-20',
        currentScale < MIN_SCALE_FOR_DETAIL && isOwner
          ? 'top-1/2 -translate-y-1/2 left-1/3 -translate-x-1/2 text-[32px] mt-4 ml-4'
          : 'top-0 right-0 text-[32px]',
      )}
      style={currentScale < MIN_SCALE_FOR_DETAIL && isOwner ? 'scale: 1.8' : ''}
      onclick={handleClick}
    >
      {#if estimatedNukeTime == -1}
        inf.
      {:else}
        <LandNukeShield {estimatedNukeTime} />
      {/if}
    </div>
  {/if}

  {#if BuildingLand.is(land) && isOwner && land.type === 'building' && !isNuking}
    <div
      class={cn(
        'absolute z-20',
        currentScale < MIN_SCALE_FOR_DETAIL && isOwner
          ? 'bottom-1/4 right-0 mr-4'
          : 'top-8 left-1/2',
      )}
      style="transform: {currentScale < MIN_SCALE_FOR_DETAIL && isOwner
        ? 'translate(-50%, -100%) scale(1.5)'
        : 'translate(-50%, -100%)'}"
    >
      <LandTaxClaimer
        land={createLandWithActions(land, () => globalLandStore.getAllLands())}
      />
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
  .tile-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 10;
    background:
      linear-gradient(rgba(0, 0, 46, 0.8), rgba(0, 0, 46, 0.8)),
      url('/ui/stripe-texture.png');
    background-size: 25% 25%;
    background-repeat: repeat;
    opacity: 0.5;
    pointer-events: none;
  }
  .building-overlay {
    width: 80%;
    height: 80%;
    top: 10%;
    left: 10%;
    box-sizing: border-box;
  }
  .centered-tax-shield {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 20;
    width: 80%;
    pointer-events: auto;
  }
</style>
