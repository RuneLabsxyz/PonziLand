<script lang="ts">
  import { selectedLand } from '$lib/stores/stores.svelte';
  import data from '$lib/data.json';
  import type { LandWithActions } from '$lib/api/land.svelte';

  let backgroundImage = $state('/tiles/grass.jpg');

  
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

  function handleClick() {
    console.log('clicked');
    $selectedLand = {
      location: land.location,
      owner: land.owner,
      sellPrice: land.sellPrice,
      tokenUsed: land.tokenUsed,
      tokenAddress: land.tokenAddress,
      claim: land.claim,
      nuke: land.nuke,
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

    const castleTypes = ['basic', 'advanced', 'premium'] as const;
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
  class={`tile ${land.type === 'auction' ? 'tile-auction' : ''} ${
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
></div>

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
