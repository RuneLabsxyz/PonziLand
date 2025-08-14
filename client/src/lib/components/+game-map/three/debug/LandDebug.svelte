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
  import {
    coordinatesToLocation,
    toHexWithPadding,
    padAddress,
  } from '$lib/utils';
  import type { ParsedEntity } from '@dojoengine/sdk';
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

    const currentIndex = data.availableTokens.findIndex(
      (token) => token.address === landTokenUsed?.address,
    );
    const nextIndex = (currentIndex + 1) % data.availableTokens.length;
    landTokenUsed = data.availableTokens[nextIndex];
  }

  // Update form values when selected land changes
  $effect(() => {
    if (land && land.type === 'building') {
      // Update land form values from selected land
      landOwner = land.owner ?? '0x123';
      // Convert sell_price to decimal for display
      if (land.sell_price) {
        const sellPriceStr = land.sell_price.toString();
        if (sellPriceStr.startsWith('0x')) {
          // If it's a hex string, parse it as hex
          landSellPrice = parseInt(sellPriceStr, 16).toString();
        } else {
          // If it's already decimal, use as is
          landSellPrice = sellPriceStr;
        }
      } else {
        landSellPrice = '1000000';
      }
      
      // Convert block_date_bought to decimal for display  
      if (land.block_date_bought) {
        const blockDateStr = land.block_date_bought.toString();
        if (blockDateStr.startsWith('0x')) {
          // If it's a hex string, parse it as hex
          landBlockDateBought = parseInt(blockDateStr, 16).toString();
        } else {
          // If it's already decimal, use as is
          landBlockDateBought = blockDateStr;
        }
      } else {
        landBlockDateBought = Date.now().toString();
      }

      // Find and set the token
      const foundToken = data.availableTokens.find(
        (token) => token.address === land.token?.address,
      );
      if (foundToken) {
        landTokenUsed = foundToken;
      }

      // Set level - convert Level number to string representation
      switch (land.level) {
        case 1:
          landLevel = 'Zero';
          break;
        case 2:
          landLevel = 'First';
          break;
        case 3:
          landLevel = 'Second';
          break;
        default:
          landLevel = 'Zero';
      }

      // Update stake values if the land has stake data
      if (land.stakeAmount) {
        stakeAmount = land.stakeAmount.toBignumberish().toString();
      } else {
        stakeAmount = '100';
      }
      
      // Get neighbors info packed value (convert from hex if needed)
      if (land.neighborsInfoPacked) {
        stakeNeighborsInfo = typeof land.neighborsInfoPacked === 'string' && land.neighborsInfoPacked.startsWith('0x')
          ? parseInt(land.neighborsInfoPacked, 16).toString()
          : land.neighborsInfoPacked.toString();
      } else {
        stakeNeighborsInfo = '0';
      }
      
      // Set accumulated taxes - this may not be directly available on BaseLand
      stakeAccumulatedTaxes = '0'; // Default value
    } else if (land && land.type === 'auction') {
      // Update auction form values from selected auction land
      const auctionLand = land as AuctionLand;
      // Use raw values for consistency with contract data
      auctionStartPrice =
        auctionLand.startPrice?.toBignumberish().toString() ?? '1000';
      auctionFloorPrice =
        auctionLand.floorPrice?.toBignumberish().toString() ?? '500';
      auctionDecayRate = '100'; // Default decay rate as there's no direct accessor

      // Reset land values to defaults for auction
      landOwner = '0x123';
      landSellPrice = '1000000';
      landBlockDateBought = Date.now().toString();
      landTokenUsed = data.availableTokens[0];
      landLevel = 'Zero';
    } else {
      // Reset all to defaults for empty lands
      landOwner = '0x123';
      landSellPrice = '1000000';
      landBlockDateBought = Date.now().toString();
      landTokenUsed = data.availableTokens[0];
      landLevel = 'Zero';

      // Reset stake values
      stakeAmount = '100';
      stakeNeighborsInfo = '0';
      stakeAccumulatedTaxes = '0';

      // Reset auction values
      auctionStartPrice = '1000';
      auctionFloorPrice = '500';
      auctionDecayRate = '100';
    }
  });

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
      if (landSellPrice && !isNaN(parseInt(landSellPrice)))
        land.sell_price = toHexWithPadding(parseInt(landSellPrice));
      if (landTokenUsed) land.token_used = landTokenUsed.address;
      if (landBlockDateBought && !isNaN(parseInt(landBlockDateBought)))
        land.block_date_bought = toHexWithPadding(
          parseInt(landBlockDateBought),
        );
      // @ts-ignore
      land.level = landLevel;

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
      if (stakeAmount && !isNaN(parseInt(stakeAmount))) 
        stake.amount = toHexWithPadding(parseInt(stakeAmount));
      if (stakeNeighborsInfo && !isNaN(parseInt(stakeNeighborsInfo)))
        stake.neighbors_info_packed = toHexWithPadding(
          parseInt(stakeNeighborsInfo),
        );
      if (stakeAccumulatedTaxes && !isNaN(parseInt(stakeAccumulatedTaxes)))
        stake.accumulated_taxes_fee = toHexWithPadding(
          parseInt(stakeAccumulatedTaxes),
        );

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
      console.log('Creating auction at selected location');

      const locationValue = toHexWithPadding(coordinatesToLocation(location));
      
      // Create auction entity
      const auction: Partial<Auction> = {
        land_location: locationValue,
        start_time: toHexWithPadding(Math.floor(Date.now() / 1000)), // Current time in seconds
        is_finished: false,
      };
      
      if (auctionStartPrice && !isNaN(parseInt(auctionStartPrice)))
        auction.start_price = toHexWithPadding(parseInt(auctionStartPrice));
      if (auctionFloorPrice && !isNaN(parseInt(auctionFloorPrice)))
        auction.floor_price = toHexWithPadding(parseInt(auctionFloorPrice));
      if (auctionDecayRate && !isNaN(parseInt(auctionDecayRate)))
        auction.decay_rate = toHexWithPadding(parseInt(auctionDecayRate));

      // For empty lands, we might need to create both Land and Auction entities
      const parsedEntity = {
        entityId: locationValue,
        models: {
          ponzi_land: {
            // Create a basic land entity if it doesn't exist
            Land: {
              location: locationValue,
              owner: padAddress('0x0'), // Empty/placeholder owner
              sell_price: toHexWithPadding(0),
              token_used: landTokenUsed?.address ?? data.availableTokens[0]?.address ?? '',
              block_date_bought: toHexWithPadding(Math.floor(Date.now() / 1000)),
              level: landLevel,
            },
            // Add the auction
            Auction: auction,
          },
        },
      };

      // @ts-ignore
      landStore.updateLand(parsedEntity);
      console.log('Auction created successfully');
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

  <Folder title="Nuking status" expanded={false}>
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

  <Folder title="Land Actions" expanded={false}>
    <Text bind:value={landOwner} label="Owner Address" disabled={loading} />
    <List
      bind:value={landLevel}
      options={{
        Zero: 'Zero',
        First: 'First',
        Second: 'Second',
      }}
      label="Level"
      disabled={loading}
    />
    <Text bind:value={landSellPrice} label="Sell Price" disabled={loading} />
    <Monitor
      value={landTokenUsed?.symbol ?? 'No token'}
      label="Selected Token"
    />
    <Button
      on:click={selectNextToken}
      label="Change Token"
      title="Cycle through available tokens"
      disabled={loading}
    />
    <Text
      bind:value={landBlockDateBought}
      label="Block Date Bought"
      disabled={loading}
    />
    <Button
      on:click={handleLandUpdate}
      label="Update Land"
      title="Update Land"
      disabled={loading}
    />
  </Folder>

  <Folder title="Stake Actions" expanded={false}>
    <Text bind:value={stakeAmount} label="Stake Amount" disabled={loading} />
    <Text
      bind:value={stakeNeighborsInfo}
      label="Neighbors Info"
      disabled={loading}
    />
    <Text
      bind:value={stakeAccumulatedTaxes}
      label="Accumulated Taxes"
      disabled={loading}
    />
    <Button
      on:click={handleLandStakeUpdate}
      label="Update Stake"
      title="Update Land Stake"
      disabled={loading}
    />
  </Folder>

  <Folder title="Auction Actions" expanded={false}>
    <Text
      bind:value={auctionStartPrice}
      label="Start Price"
      disabled={loading}
    />
    <Text
      bind:value={auctionFloorPrice}
      label="Floor Price"
      disabled={loading}
    />
    <Text bind:value={auctionDecayRate} label="Decay Rate" disabled={loading} />
    <Button
      on:click={handleAuctionUpdate}
      label="Create Auction"
      title="Create auction at selected location with current parameters"
      disabled={loading}
    />
  </Folder>
</Pane>
