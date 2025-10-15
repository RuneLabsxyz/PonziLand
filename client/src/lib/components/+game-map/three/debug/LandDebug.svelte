<script lang="ts">
  import type { BaseLand } from '$lib/api/land';
  import { AuctionLand } from '$lib/api/land/auction_land';
  import { GRID_SIZE } from '$lib/const';
  import type { Auction, Land, LandStake, SchemaType } from '$lib/models.gen';
  import { nukeStore } from '$lib/stores/nuke.store.svelte';
  import { landStore, selectedLand } from '$lib/stores/store.svelte';
  import { claimStore } from '$lib/stores/claim.store.svelte';
  import { claimQueue, notificationQueue } from '$lib/stores/event.store.svelte';
  import { BuildingLand } from '$lib/api/land/building_land';
  import { createLandWithActions } from '$lib/utils/land-actions';
  import { getAggregatedTaxes, type TaxData } from '$lib/utils/taxes';
  import {
    coordinatesToLocation,
    getTokenInfo,
    padAddress,
    toHexWithPadding,
  } from '$lib/utils';
  import data from '$profileData';
  import type { ParsedEntity } from '@dojoengine/sdk';
  import {
    Button,
    Folder,
    List,
    Monitor,
    Pane,
    Point,
    Text,
  } from 'svelte-tweakpane-ui';

  const ENTITY_TYPES = ['Land', 'LandStake', 'Auction'] as const;
  type EntityType = (typeof ENTITY_TYPES)[number];

  let loading = $state(false);
  let error = $state<string | null>(null);
  
  // Claim simulation state
  let claimSimulationLoading = $state(false);
  let claimSimulationResult = $state<{
    taxes: TaxData[];
    nukables: any[];
    landWithActions: any;
  } | null>(null);
  let claimSimulationError = $state<string | null>(null);

  let selectedLocation = $derived.by(() => {
    let land = selectedLand.value;
    return land ? land.location : { x: 0, y: 0 };
  });

  let location = $derived(selectedLocation);

  let landEntryStore = $derived(landStore.getLand(location.x, location.y));
  let land: BaseLand | undefined = $derived($landEntryStore);

  // Land form state - using $derived values directly
  let landOwner = $derived(
    land && land.type === 'building' ? (land.owner ?? '-') : '-',
  );

  let landSellPrice = $derived.by(() => {
    if (land && land.type === 'building' && land.sell_price) {
      const sellPriceStr = land.sell_price.toString();
      return sellPriceStr.startsWith('0x')
        ? parseInt(sellPriceStr, 16).toString()
        : sellPriceStr;
    }
    return '-';
  });

  let landBlockDateBought = $derived.by(() => {
    if (land && land.type === 'building' && land.block_date_bought) {
      const blockDateStr = land.block_date_bought.toString();
      return blockDateStr.startsWith('0x')
        ? parseInt(blockDateStr, 16).toString()
        : blockDateStr;
    }
    return '-';
  });

  let landTokenUsed = $derived.by(() => {
    if (land && land.type === 'building' && land.token) {
      const foundToken = data.availableTokens.find(
        (token) => token.address === land.token?.address,
      );
      if (foundToken) return foundToken;
    }
    return undefined;
  });

  let landLevel = $derived(
    land && land.type === 'building' ? (land.level ?? 0) : 0,
  );

  // LandStake form state
  let stakeAmount = $derived.by(() => {
    if (land && land.type === 'building' && land.stakeAmount) {
      return land.stakeAmount.toBignumberish().toString();
    }
    return '-';
  });

  let stakeNeighborsInfo = $derived.by(() => {
    if (land && land.type === 'building' && land.neighborsInfoPacked) {
      return typeof land.neighborsInfoPacked === 'string' &&
        land.neighborsInfoPacked.startsWith('0x')
        ? parseInt(land.neighborsInfoPacked, 16).toString()
        : land.neighborsInfoPacked.toString();
    }
    return '-';
  });

  let stakeAccumulatedTaxes = $derived('-');

  // Auction form state
  let auctionStartPrice = $derived.by(() => {
    if (land && land.type === 'auction') {
      const auctionLand = land as AuctionLand;
      return auctionLand.startPrice?.toBignumberish().toString() ?? '-';
    }
    return '-';
  });

  let auctionFloorPrice = $derived.by(() => {
    if (land && land.type === 'auction') {
      const auctionLand = land as AuctionLand;
      return auctionLand.floorPrice?.toBignumberish().toString() ?? '-';
    }
    return '-';
  });

  let auctionDecayRate = $derived('-');

  let landType = $derived(land?.type ?? 'empty');
  let coordinate = $derived(land ? coordinatesToLocation(land.location) : -1);

  let locationString = $derived(coordinatesToLocation(location).toString());

  function simulateNuke() {
    nukeStore.animationManager.triggerAnimation(locationString);
  }

  async function simulateClaimSingleLand() {
    if (!land || land.type !== 'building') {
      claimSimulationError = 'No building land selected for claim simulation';
      return;
    }

    try {
      claimSimulationLoading = true;
      claimSimulationError = null;
      claimSimulationResult = null;

      // Create LandWithActions from current land
      const landWithActions = createLandWithActions(
        land as BuildingLand,
        landStore.getAllLands,
      );

      if (!landWithActions) {
        throw new Error('Failed to create LandWithActions from selected land');
      }

      // Fetch actual aggregated taxes (this is the real data)
      const result = await getAggregatedTaxes(landWithActions);

      // Store simulation result
      claimSimulationResult = {
        taxes: result.taxes,
        nukables: result.nukables,
        landWithActions: landWithActions
      };

      console.log('Claim simulation completed:', claimSimulationResult);

    } catch (e) {
      console.error('Error in claim simulation:', e);
      claimSimulationError = e instanceof Error ? e.message : 'Unknown error occurred';
    } finally {
      claimSimulationLoading = false;
    }
  }

  async function simulatePostClaimAnimations() {
    if (!land || !locationString) {
      console.error('No land selected or location string not available');
      return;
    }

    // Initialize claim store entry if it doesn't exist
    if (!claimStore.value[locationString]) {
      claimStore.value[locationString] = {
        claimable: true,
        animating: false,
        land: land as any // Type cast for debug purposes
      };
    }

    // Simulate the postclaim animation states
    claimStore.value[locationString].animating = true;
    claimStore.value[locationString].claimable = false;

    // Animation timeout - disable animation after 2 seconds
    setTimeout(() => {
      claimStore.value[locationString].animating = false;
    }, 2000);

    // Claimable timeout - re-enable claimable after 30 seconds for houses
    setTimeout(() => {
      if (land.type === 'building') {
        claimStore.value[locationString].claimable = true;
      }
    }, 30 * 1000);

    // Add mock tax data to claim queue
    if (landTokenUsed) {
      // For demo purposes, just log that we would add to claim queue
      // The actual implementation would need proper CurrencyAmount objects
      console.log('Would add mock tax to claim queue for token:', landTokenUsed.symbol);
    }

    console.log('Simulated postclaim animations for location:', locationString);
  }

  // Create token options for List component
  const tokenOptions = $derived.by(() => {
    const options: Record<string, string> = {};
    data.availableTokens.forEach((token) => {
      options[token.symbol] = token.address;
    });
    return options;
  });

  let selectedTokenAddress = $derived(landTokenUsed?.address ?? '');

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
              token_used:
                landTokenUsed?.address ??
                data.availableTokens[0]?.address ??
                '',
              block_date_bought: toHexWithPadding(
                Math.floor(Date.now() / 1000),
              ),
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

<Pane title="Land Info" position="draggable" x={380} y={20}>
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
    <Monitor
      value={nukeStore.pending[locationString] ?? false}
      label="isPending"
    />
    <Monitor
      value={nukeStore.nuking[locationString] ?? false}
      label="isNuking"
    />
  </Folder>

  <Folder title="Claim Simulation" expanded={false}>
    <Button
      on:click={() => simulateClaimSingleLand()}
      label="Simulate Claim"
      title="Fetch real tax data without sending transaction"
      disabled={claimSimulationLoading}
    />
    <Monitor
      value={claimSimulationLoading}
      label="Loading"
    />
    
    {#if claimSimulationError}
      <Monitor
        value={claimSimulationError}
        label="Error"
      />
    {/if}
    
    {#if claimSimulationResult}
      <Monitor
        value={claimSimulationResult.taxes.length}
        label="Tax Records"
      />
      <Monitor
        value={claimSimulationResult.nukables.length}
        label="Nukable Records"
      />
      {#if claimSimulationResult.taxes.length > 0}
        {#each claimSimulationResult.taxes as tax, i}
          <Monitor
            value={`${tax.totalTax.toBignumberish().toString()} ${tax.tokenSymbol}`}
            label={`Tax ${i + 1}`}
          />
        {/each}
      {/if}
      {#if claimSimulationResult.nukables.length > 0}
        {#each claimSimulationResult.nukables as nukable, i}
          <Monitor
            value={nukable.nukable ? 'YES' : 'NO'}
            label={`Nukable ${i + 1}`}
          />
        {/each}
      {/if}
      <Button
        on:click={() => simulatePostClaimAnimations()}
        label="Trigger Animations"
        title="Trigger the postclaim frontend animations"
        disabled={false}
      />
    {/if}
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
        1: 1,
        2: 2,
        3: 3,
      }}
      label="Level"
      disabled={loading}
    />
    <Text bind:value={landSellPrice} label="Sell Price" disabled={loading} />
    <List
      bind:value={selectedTokenAddress}
      options={tokenOptions}
      label={'Token'}
      disabled={loading}
      on:change={(e) => {
        const token = data.availableTokens.find(
          (t) => t.address === e.detail.value,
        );
        if (token) landTokenUsed = token;
      }}
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
