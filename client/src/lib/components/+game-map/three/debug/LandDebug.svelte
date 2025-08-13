<script lang="ts">
  import {
    Pane,
    Folder,
    Slider,
    List,
    Checkbox,
    Button,
    Separator,
    Point,
    Monitor,
  } from 'svelte-tweakpane-ui';
  import { landStore, selectedLand } from '$lib/stores/store.svelte';
  import { useClient } from '$lib/contexts/client.svelte';
  import { AuctionLand } from '$lib/api/land/auction_land';
  import type { BaseLand, LandWithActions } from '$lib/api/land';
  import { GRID_SIZE } from '$lib/const';
  import {
    clearNuking,
    markAsNuking,
    nukeStore,
  } from '$lib/stores/nuke.store.svelte';

  let selectedLocation = $derived.by(() => {
    let land = selectedLand.value;
    return land ? land.location : { x: 0, y: 0 };
  });

  let location = $derived(selectedLocation);

  let landEntryStore = $derived(landStore.getLand(location.x, location.y));
  let land: BaseLand | undefined = $derived($landEntryStore);

  let landType = $derived(land?.type ?? 'empty');
  let coordinate = $derived(
    land ? land.location.x + land.location.y * GRID_SIZE : -1,
  );

  function simulateNuke() {
    markAsNuking(coordinate.toString());

    setTimeout(() => {
      clearNuking(coordinate.toString());
    }, 3500);
  }
</script>

<Pane title="Land Info" position="draggable" x={360} y={120}>
  <Folder title="Basic">
    <Point
      bind:value={location}
      expanded={false}
      label="Location"
      picker="inline"
      userExpandable={false}
      optionsX={{
        step: 1,
      }}
      optionsY={{
        step: 1,
      }}
    />
    <Monitor value={coordinate.toFixed(0)} label="Coordinate" />
    <Monitor value={land?.type ?? 'empty'} label="Building type" />
  </Folder>
  {#if landType == 'auction'}
    {@const auction = land as AuctionLand}
    <Folder title="Auction">
      <Monitor value={auction.startPrice.toString()} label="Start Price" />
      <Monitor value={auction.startTime.toISOString()} label="Started at" />
    </Folder>
  {:else if landType == 'building'}
    <Folder title="Building">
      <Monitor value={land?.token?.symbol ?? '-'} label="Token Symbol" />
      <Monitor value={land?.owner ?? '-'} label="Owner ID" />
    </Folder>
  {/if}

  <Folder title="Nuking status">
    <Button
      on:click={() => simulateNuke()}
      label="Simulate Nuke"
      title="Nuke"
    />
    <Monitor value={nukeStore.pending[coordinate] ?? false} label="isPending" />
    <Monitor value={nukeStore.nuking[coordinate] ?? false} label="isNuking" />
  </Folder>
</Pane>
