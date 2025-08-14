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
    Text,
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
  import type { Auction, Land, LandStake, SchemaType } from '$lib/models.gen';
  import { coordinatesToLocation, toHexWithPadding, padAddress } from '$lib/utils';
  import type { ParsedEntity } from '@dojoengine/sdk';
  import { CairoCustomEnum } from 'starknet';
  import data from '$profileData';
  import type { Token } from '$lib/interfaces';

  const ENTITY_TYPES = ['Land', 'LandStake', 'Auction'] as const;
  type EntityType = (typeof ENTITY_TYPES)[number];

  let loading = $state(false);
  let error = $state<string | null>(null);

  // Land form state
  let landOwner = $state('0x123');
  let landSellPrice = $state('1000000');
  let landTokenUsed = $state<Token | undefined>(data.availableTokens[0]);
  let landBlockDateBought = $state(Date.now().toString());
  let landLevel = $state('Zero');

  // LandStake form state
  let stakeAmount = $state('100');
  let stakeNeighborsInfo = $state('0');
  let stakeAccumulatedTaxes = $state('0');

  // Auction form state
  let auctionStartPrice = $state('1000');
  let auctionFloorPrice = $state('500');
  let auctionDecayRate = $state('100');

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

  function selectNextToken() {
    if (!landTokenUsed) {
      landTokenUsed = data.availableTokens[0];
      return;
    }
    
    const currentIndex = data.availableTokens.findIndex(token => token.address === landTokenUsed.address);
    const nextIndex = (currentIndex + 1) % data.availableTokens.length;
    landTokenUsed = data.availableTokens[nextIndex];
  }

  function createParsedEntity(
    type: EntityType,
    entity: Partial<Land | LandStake | Auction>,
    locationValue: string,
  ): ParsedEntity<SchemaType> {
    try {
      const parsedEntity = {
        entityId: locationValue,
        models: {
          ponzi_land: {
            ...(type === 'Land' && {
              Land: { ...(entity as Land), location: locationValue },
            }),
            ...(type === 'LandStake' && {
              LandStake: { ...(entity as LandStake), location: locationValue },
            }),
            ...(type === 'Auction' && {
              Auction: { ...(entity as Auction), land_location: locationValue },
            }),
          },
        },
      };

      console.log('Created parsed entity:', parsedEntity);
      return parsedEntity;
    } catch (e) {
      console.error('Error creating parsed entity:', e);
      throw e;
    }
  }

  function handleLandUpdate() {
    try {
      loading = true;
      error = null;
      console.log('Updating land');

      const land: Partial<Land> = {};
      if (landOwner) land.owner = padAddress(landOwner);
      if (landSellPrice) land.sell_price = toHexWithPadding(parseInt(landSellPrice));
      if (landTokenUsed) land.token_used = landTokenUsed.address;
      if (landBlockDateBought)
        land.block_date_bought = toHexWithPadding(parseInt(landBlockDateBought));
      land.level = new CairoCustomEnum({ [landLevel]: '' });

      const locationValue = toHexWithPadding(coordinatesToLocation(location));
      const parsedEntity = createParsedEntity('Land', land, locationValue);
      landStore.updateLand(parsedEntity);
      console.log('Land update successful');
    } catch (e) {
      console.error('Error updating land:', e);
      error =
        e instanceof Error
          ? e.message
          : 'An error occurred while updating land';
    } finally {
      loading = false;
    }
  }

  function handleLandStakeUpdate() {
    try {
      loading = true;
      error = null;
      console.log('Updating land stake');

      const stake: Partial<LandStake> = {};
      if (stakeAmount) stake.amount = toHexWithPadding(parseInt(stakeAmount));
      if (stakeNeighborsInfo) stake.neighbors_info_packed = toHexWithPadding(parseInt(stakeNeighborsInfo));
      if (stakeAccumulatedTaxes) stake.accumulated_taxes_fee = toHexWithPadding(parseInt(stakeAccumulatedTaxes));

      const locationValue = toHexWithPadding(coordinatesToLocation(location));
      const parsedEntity = createParsedEntity(
        'LandStake',
        stake,
        locationValue,
      );
      landStore.updateLand(parsedEntity);
      console.log('Land stake update successful');
    } catch (e) {
      console.error('Error updating land stake:', e);
      error =
        e instanceof Error
          ? e.message
          : 'An error occurred while updating land stake';
    } finally {
      loading = false;
    }
  }

  function handleAuctionUpdate() {
    try {
      loading = true;
      error = null;
      console.log('Updating auction');

      const auction: Partial<Auction> = {};
      if (auctionStartPrice) auction.start_price = toHexWithPadding(parseInt(auctionStartPrice));
      if (auctionFloorPrice) auction.floor_price = toHexWithPadding(parseInt(auctionFloorPrice));
      if (auctionDecayRate) auction.decay_rate = toHexWithPadding(parseInt(auctionDecayRate));

      const locationValue = toHexWithPadding(coordinatesToLocation(location));
      const parsedEntity = createParsedEntity(
        'Auction',
        auction,
        locationValue,
      );
      landStore.updateLand(parsedEntity);
      console.log('Auction update successful');
    } catch (e) {
      console.error('Error updating auction:', e);
      error =
        e instanceof Error
          ? e.message
          : 'An error occurred while updating auction';
    } finally {
      loading = false;
    }
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

  {#if error}
    <Folder title="Error">
      <Monitor value={error} label="Error Message" />
    </Folder>
  {/if}

  <Folder title="Land Actions">
    <Text bind:value={landOwner} label="Owner Address" disabled={loading} />
    <List
      bind:value={landLevel}
      options={{
        Zero: 'Zero',
        First: 'First', 
        Second: 'Second'
      }}
      label="Level"
      disabled={loading}
    />
    <Text bind:value={landSellPrice} label="Sell Price" disabled={loading} />
    <Monitor value={landTokenUsed?.symbol ?? 'No token'} label="Selected Token" />
    <Button
      on:click={selectNextToken}
      label="Change Token"
      title="Cycle through available tokens"
      disabled={loading}
    />
    <Text bind:value={landBlockDateBought} label="Block Date Bought" disabled={loading} />
    <Button
      on:click={handleLandUpdate}
      label="Update Land"
      title="Update Land"
      disabled={loading}
    />
  </Folder>

  <Folder title="Stake Actions">
    <Text bind:value={stakeAmount} label="Stake Amount" disabled={loading} />
    <Text bind:value={stakeNeighborsInfo} label="Neighbors Info" disabled={loading} />
    <Text bind:value={stakeAccumulatedTaxes} label="Accumulated Taxes" disabled={loading} />
    <Button
      on:click={handleLandStakeUpdate}
      label="Update Stake"
      title="Update Land Stake"
      disabled={loading}
    />
  </Folder>

  <Folder title="Auction Actions">
    <Text bind:value={auctionStartPrice} label="Start Price" disabled={loading} />
    <Text bind:value={auctionFloorPrice} label="Floor Price" disabled={loading} />
    <Text bind:value={auctionDecayRate} label="Decay Rate" disabled={loading} />
    <Button
      on:click={handleAuctionUpdate}
      label="Update Auction"
      title="Update Auction"
      disabled={loading}
    />
  </Folder>
</Pane>
