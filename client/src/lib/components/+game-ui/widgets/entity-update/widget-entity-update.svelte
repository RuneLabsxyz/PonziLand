<script lang="ts">
  import * as Tabs from '$lib/components/ui/tabs';
  import type { Auction, Land, LandStake, SchemaType } from '$lib/models.gen';
  import { landStore } from '$lib/stores/store.svelte';
  import { coordinatesToLocation, toHexWithPadding } from '$lib/utils';
  import type { ParsedEntity } from '@dojoengine/sdk';
  import AuctionForm from './auction-form.svelte';
  import LandForm from './land-form.svelte';
  import LandStakeForm from './land-stake-form.svelte';

  const ENTITY_TYPES = ['Land', 'LandStake', 'Auction'] as const;
  type EntityType = (typeof ENTITY_TYPES)[number];

  let selectedType = $state<EntityType>('Land');
  let location = $state({ x: 32, y: 32 });
  let loading = $state(false);
  let error = $state<string | null>(null);
  let componentMounted = $state(true);

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

  async function handleLandUpdate(land: Partial<Land>) {
    try {
      loading = true;
      error = null;
      console.log('Updating land:', land);

      const locationValue = toHexWithPadding(coordinatesToLocation(location));
      const parsedEntity = createParsedEntity('Land', land, locationValue);
      landStore.updateLand(parsedEntity);
      console.log('Land update successful');
    } catch (e) {
      console.error('Error updating land:', e);
      error = e instanceof Error ? e.message : 'An error occurred while updating land';
    } finally {
      loading = false;
    }
  }

  async function handleLandStakeUpdate(stake: Partial<LandStake>) {
    try {
      loading = true;
      error = null;
      console.log('Updating land stake:', stake);

      const locationValue = toHexWithPadding(coordinatesToLocation(location));
      const parsedEntity = createParsedEntity('LandStake', stake, locationValue);
      landStore.updateLand(parsedEntity);
      console.log('Land stake update successful');
    } catch (e) {
      console.error('Error updating land stake:', e);
      error = e instanceof Error ? e.message : 'An error occurred while updating land stake';
    } finally {
      loading = false;
    }
  }

  async function handleAuctionUpdate(auction: Partial<Auction>) {
    try {
      loading = true;
      error = null;
      console.log('Updating auction:', auction);

      const locationValue = toHexWithPadding(coordinatesToLocation(location));
      const parsedEntity = createParsedEntity('Auction', auction, locationValue);
      landStore.updateLand(parsedEntity);
      console.log('Auction update successful');
    } catch (e) {
      console.error('Error updating auction:', e);
      error = e instanceof Error ? e.message : 'An error occurred while updating auction';
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    if (selectedType) {
      console.log('Selected type changed:', selectedType);
    }
  });

  $effect(() => {
    if (location.x !== undefined && location.y !== undefined) {
      console.log('Location changed:', location);
    }
  });
</script>

<div class="space-y-4 p-4 entity-update-widget">
  <div class="space-y-2">
    <h2 class="text-lg font-semibold">Update Entity</h2>
    <p class="text-sm text-muted-foreground">
      Select an entity type and location to update its properties
    </p>
  </div>

  <div class="grid grid-cols-2 gap-4">
    <div>
      <label class="text-sm font-medium">Entity Type</label>
      <select
        class="w-full rounded-md border border-input bg-background px-3 py-2"
        bind:value={selectedType}
        disabled={loading}
      >
        {#each ENTITY_TYPES as type}
          <option value={type}>{type}</option>
        {/each}
      </select>
    </div>
    <div class="grid grid-cols-2 gap-2">
      <div>
        <label class="text-sm font-medium">X Coordinate</label>
        <input
          type="number"
          class="w-full rounded-md border border-input bg-background px-3 py-2"
          bind:value={location.x}
          disabled={loading}
        />
      </div>
      <div>
        <label class="text-sm font-medium">Y Coordinate</label>
        <input
          type="number"
          class="w-full rounded-md border border-input bg-background px-3 py-2"
          bind:value={location.y}
          disabled={loading}
        />
      </div>
    </div>
  </div>

  {#if error}
    <div class="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
      {error}
    </div>
  {/if}

  <Tabs.Root 
    value={selectedType} 
    onValueChange={(v) => {
      try {
        selectedType = v as EntityType;
      } catch (e) {
        console.error('Error changing tab:', e);
        error = 'Failed to change tab';
      }
    }}
    disabled={loading}
  >
    <Tabs.List class="grid w-full grid-cols-3">
      {#each ENTITY_TYPES as type}
        <Tabs.Trigger value={type} disabled={loading}>{type}</Tabs.Trigger>
      {/each}
    </Tabs.List>
    <Tabs.Content value="Land">
      <LandForm onSubmit={handleLandUpdate} {loading} />
    </Tabs.Content>
    <Tabs.Content value="LandStake">
      <LandStakeForm onSubmit={handleLandStakeUpdate} {loading} />
    </Tabs.Content>
    <Tabs.Content value="Auction">
      <AuctionForm onSubmit={handleAuctionUpdate} {loading} />
    </Tabs.Content>
  </Tabs.Root>
</div>

<style>
  .entity-update-widget {
    min-width: 400px;
    min-height: 300px;
    position: relative;
  }

  :global(.tabs-trigger[data-disabled]) {
    opacity: 0.5;
    cursor: not-allowed;
  }

  :global(.tabs-content[data-disabled]) {
    opacity: 0.5;
    pointer-events: none;
  }
</style>
