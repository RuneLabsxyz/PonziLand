<script lang="ts">
  import type { Tile } from './stores.svelte';
  import Button from '$lib/components/ui/button/button.svelte';
  import NukeExplosion from '$lib/components/ui/nuke-explosion.svelte';

  import { cn, hexStringToNumber } from '$lib/utils';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import LandDisplay from '$lib/components/+game-map/land/land-display.svelte';
  import LandNukeAnimation from '$lib/components/+game-map/land/land-nuke-animation.svelte';
  import LandNukeShield from '$lib/components/+game-map/land/land-nuke-shield.svelte';
  import LandTaxClaimer from '$lib/components/+game-map/land/land-tax-claimer.svelte';
  import RatesOverlay from './rates-tutorial.svelte';
  import { tileState } from './stores.svelte';
  import { selectedLand } from '$lib/stores/store.svelte';

  // Create a simple modal store since uiStore is not found
  const modalStore = {
    showModal: false,
    modalType: '',
    modalData: null as any,
  };

  let { land, dragged, scale } = $props<{
    land: Tile;
    dragged: boolean;
    scale: number;
  }>();

  let isNuking = $derived(tileState.getNuke());
  let isOwner = false;

  const estimatedNukeTime = $derived(land.timeToNuke);

  let selected = $derived(selectedLand.value?.location === land.location);

  let hovering = $state(false);

  function handleClick() {
    console.log('clicked', dragged);
    if (!dragged) {
      selectedLand.value = land;
    }
  }

  const handleBuyLandClick = () => {
    console.log('Buy land clicked');

    modalStore.showModal = true;
    modalStore.modalType = 'buy';
    modalStore.modalData = {
      location: hexStringToNumber(land.location),
      sellPrice: CurrencyAmount.fromScaled(0),
      tokenUsed: '',
      tokenAddress: '',
      owner: undefined,
    };
  };

  const handleBidClick = () => {
    console.log('Bid land clicked');

    modalStore.showModal = true;
    modalStore.modalType = 'bid';
  };

  //TODO: handle nuke animation based on tutorial state
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
    {#if land.type == 'grass'}
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
      <RatesOverlay />
      {#if isOwner}
        <Button
          size="sm"
          class="absolute bottom-0 left-1/2 z-20"
          style="transform: translate(-50%, 0) scale(0.5)"
          onclick={() => {
            modalStore.showModal = true;
            modalStore.modalType = 'land-info';
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

  {#if isNuking && land == tileState.getTiles()[8][8]}
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
      <LandNukeShield {estimatedNukeTime} />
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
