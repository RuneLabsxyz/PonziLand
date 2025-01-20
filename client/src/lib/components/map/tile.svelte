<script lang="ts">
  import { nukableStore, type LandWithActions } from '$lib/api/land.svelte';
  import { useDojo } from '$lib/contexts/dojo';
  import data from '$lib/data.json';
  import { moveCameraToLocation } from '$lib/stores/camera';
  import {
    mousePosCoords,
    selectedLand,
    selectedLandMeta,
    uiStore,
  } from '$lib/stores/stores.svelte';
  import { hexStringToNumber, padAddress, toBigInt } from '$lib/utils';
  import LandTaxClaimer from '../land/land-tax-claimer.svelte';
  import Button from '../ui/button/button.svelte';

  let backgroundImage = $state('/tiles/grass.jpg');

  const { store, client: sdk, accountManager } = useDojo();

  let { land } = $props<{
    land: Partial<LandWithActions> & {
      type: 'grass' | 'house' | 'auction';
      owner: string | undefined;
      sellPrice: number | null;
      tokenUsed: string | null;
      tokenAddress: string | null;
    };
  }>();

  let isOwner = $derived(() => {
    const accountProvider = accountManager.getProvider();
    if (!accountProvider) {
      return false;
    }
    const accountData = accountProvider.getAccount();
    if (!accountData) {
      return false;
    }
    return land?.owner == padAddress(accountData.address);
  });
  let selected = $derived($selectedLand?.location === land.location);
  let isHovering = $derived($mousePosCoords?.location == land.location);

  function handleClick() {
    if ($selectedLand?.location == land.location) {
      moveCameraToLocation(land.location);
    }

    $selectedLand = {
      type: land.type,
      location: land.location,
      owner: land.owner,
      sellPrice: land.sellPrice,
      tokenUsed: land.tokenUsed,
      tokenAddress: land.tokenAddress,
      stakeAmount: land.stakeAmount,
      claim: land.claim,
      nuke: land.nuke,
      getPendingTaxes: land.getPendingTaxes,
      getNextClaim: land.getNextClaim,
      getCurrentAuctionPrice: land.getCurrentAuctionPrice,
    };
  }

  const getCastleImage = () => {
    const token = data.availableTokens.find((t) => t.name === land.tokenUsed);
    if (!token) {
      const basicTypes = ['basic', 'advanced', 'premium'];
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
    uiStore.modalData = {
      location: hexStringToNumber($selectedLandMeta!.location),
      // TODO: Enforce null checks here
      sellPrice: $selectedLandMeta!.sellPrice ?? 0,
      tokenUsed: $selectedLandMeta!.tokenUsed ?? '',
      tokenAddress: $selectedLandMeta!.tokenAddress ?? '',
      owner: $selectedLandMeta!.owner || undefined,
    };
  };
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore event_directive_deprecated -->
<div
  on:click={handleClick}
  class={`relative tile ${land.type === 'auction' ? 'tile-auction' : ''} ${
    selected ? 'selected' : ''
  }`}
  style={land.type === 'house'
    ? `background-image: url('${backgroundImage}'), url('/tiles/grass.jpg');
               background-size: contain, cover;
               background-repeat: no-repeat, repeat;
               background-position: center, center;`
    : land.type === 'auction'
      ? `background-image: url('/tiles/grass.jpg');
               background-size: cover;
               background-position: center;
               position: relative;
               `
      : `background-image: url('/tiles/${land.type}.jpg');
               background-size: cover;
               background-position: center;`}
>
  {#if isOwner()}
    <div
      class="absolute z-10 top-1 left-1/2"
      style="transform: translate(-50%, -100%)"
    >
      <LandTaxClaimer {land} />
    </div>
  {/if}

  {#if $nukableStore.includes(toBigInt(land.location))}
    <div class="text-ponzi animate-pulse">NUKABLE</div>
  {/if}

  {#if selected}
    {#if land.type === 'auction'}
      <!-- <Button
        size="sm"
        class="absolute bottom-0 left-1/2 z-20"
        style="transform: translate(-50%, 50%)"
        onclick={() => {}}
      >
        BID
      </Button> -->
    {/if}
    {#if land.type == 'house'}
      {#if isOwner()}
        <!-- <Button
          size="sm"
          class="absolute bottom-0 left-1/2 z-20"
          style="transform: translate(-50%, 50%)"
        >
          LAND INFO
        </Button> -->
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
</div>

<style>
  .tile {
    width: 32px;
    height: 32px;
    border: 1px solid #44656b;
  }

  .tile-auction::after {
    content: '🔨';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    font-size: 12px;
    background: #ff0;
  }

  .selected {
    border: 1px solid #ff0;
    z-index: 20;
  }
</style>
