<script lang="ts">
  import { nukableStore, type LandWithActions } from '$lib/api/land.svelte';
  import type { Tile } from '$lib/api/tile-store.svelte';
  import { useDojo } from '$lib/contexts/dojo';
  import data from '$lib/data.json';
  import { moveCameraToLocation } from '$lib/stores/camera';
  import {
    accountAddress,
    mousePosCoords,
    selectedLand,
    selectedLandMeta,
    selectLand,
    uiStore,
  } from '$lib/stores/stores.svelte';
  import { hexStringToNumber, padAddress, toBigInt } from '$lib/utils';
  import LandNukeShield from '../land/land-nuke-shield.svelte';
  import LandTaxClaimer from '../land/land-tax-claimer.svelte';
  import Button from '../ui/button/button.svelte';
  import RatesOverlay from './rates-overlay.svelte';

  let backgroundImage = $state('/tiles/grass.jpg');

  const { store, client: sdk, accountManager } = useDojo();

  let {
    land,
    dragged,
    scale,
  }: { land: Tile; dragged: boolean; scale: number } = $props<{
    land: Tile;
    dragged: boolean;
    scale: number;
  }>();

  let isOwner = $derived.by(() => {
    if (land.type == 'grass') return false;
    land?.owner == padAddress($accountAddress ?? '0x1');
  });

  let estimatedNukeTime = $derived.by(() => {
    if (land.type !== 'house') return -1;
    const estimatedNukeTime = land.getEstimatedNukeTime();
    if (!estimatedNukeTime) return -1;

    return estimatedNukeTime;
  });

  let selected = $derived($selectedLand?.location === land.location);

  function handleClick() {
    console.log('clicked', dragged);
    if (dragged) return;

    if ($selectedLand?.location == land.location) {
      moveCameraToLocation(Number(land.location));
    }

    selectLand(land as LandWithActions);
  }

  const getCastleImage = () => {
    if (land.type !== 'house') return '';
    const token = data.availableTokens.find((t) => t.name === land.tokenUsed);
    if (!token) {
      const basicTypes = ['basic']; //'advanced', 'premium'
      const randomBasic =
        basicTypes[Math.floor(Math.random() * basicTypes.length)];
      return `/assets/tokens/basic/castles/${randomBasic}.png`;
    }

    const castleTypes = ['basic'] as const;
    const randomType =
      castleTypes[Math.floor(Math.random() * castleTypes.length)];
    return token.images.castle[randomType];
  };

  $effect(() => {
    backgroundImage = getCastleImage();
  });

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
    // uiStore.modalData = {
    //   location: hexStringToNumber($selectedLandMeta!.location),
    //   // TODO: Enforce null checks here
    //   sellPrice: $selectedLandMeta!.sellPrice ?? 0,
    //   tokenUsed: $selectedLandMeta!.tokenUsed ?? '',
    //   tokenAddress: $selectedLandMeta!.tokenAddress ?? '',
    //   owner: $selectedLandMeta!.owner || undefined,
    // };
  };
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore event_directive_deprecated -->
<div class="relative {selected ? 'selected' : ''}">
  <div
    onmouseup={handleClick}
    class={`relative tile ${land.type === 'auction' ? 'tile-auction' : ''}`}
    style={land.type === 'house'
      ? `background-image: url('${backgroundImage}'), url('/tiles/grass.png');
               background-size: contain, cover;
               background-repeat: no-repeat, repeat;
               background-position: center, center;`
      : `background-image: url('/tiles/${land.type}.png');
               background-size: cover;
               background-position: center;`}
  ></div>

  {#if selected}
    {#if land.type === 'auction'}
      <Button
        size="sm"
        class="absolute bottom-0 left-1/2 z-20"
        style="transform: translate(-50%, 50%)"
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
          style="transform: translate(-50%, 50%)"
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
          style="transform: translate(-50%, 50%)"
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

  {#if $nukableStore.includes(toBigInt(land.location) ?? -1n)}
    <div
      class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-ponzi animate-pulse"
    >
      NUKABLE
    </div>
  {/if}

  {#if isOwner}
    <div class="absolute top-0 left-1/2 crown -translate-x-1/2">
      <img
        src="/assets/ui/icons/Icon_Crown.png"
        alt="owned"
        style="image-rendering: pixelated;"
      />
    </div>
  {/if}
  {#if land.type == 'house'}
    <div class="absolute top-0 right-0 text-[4px]">
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
    outline: 1px solid #ff0;
    z-index: 20;
  }

  .crown {
    width: calc(max(1rem * (1 / var(--scale)), 0.5em));
  }
</style>
