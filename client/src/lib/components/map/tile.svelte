<script lang="ts">
  import {
    mousePosCoords,
    selectedLand,
    selectedLandMeta,
  } from '$lib/stores/stores.svelte';
  import data from '$lib/data.json';
  import type { LandWithActions } from '$lib/api/land.svelte';
  import LandTaxesCalculator from '../land/land-taxes-calculator.svelte';
  import { padAddress } from '$lib/utils';
  import { useDojo } from '$lib/contexts/dojo';

  let backgroundImage = $state('/tiles/grass.jpg');

  const { store, client: sdk, accountManager } = useDojo();

  const accountData = $derived(accountManager.getProvider()!.getAccount());

  let { land } = $props<{
    land: Partial<LandWithActions> & {
      type: 'grass' | 'house' | 'auction';
      owner: string | undefined;
      sellPrice: number | null;
      tokenUsed: string | null;
      tokenAddress: string | null;
    };
  }>();

  let selected = $derived($selectedLand?.location === land.location);
  let isOwner = $derived(
    $selectedLandMeta?.owner == padAddress(accountData?.address ?? ''),
  );
  let isHovering = $derived($mousePosCoords?.location == land.location);

  function handleClick() {
    console.log('clicked');
    $selectedLand = {
      type: land.type,
      location: land.location,
      owner: land.owner,
      sellPrice: land.sellPrice,
      tokenUsed: land.tokenUsed,
      tokenAddress: land.tokenAddress,
      claim: land.claim,
      nuke: land.nuke,
    };
    console.log($selectedLand);
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
  {#if selected && isOwner && isHovering}
    <div
      class="absolute z-10"
      style="transform: translate(-49%, -50%); top: 50%; left: 50%;"
    >
      <LandTaxesCalculator />
    </div>
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
  }
</style>
