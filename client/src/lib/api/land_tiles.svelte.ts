import { GRID_SIZE } from '$lib/const';
import { derived, writable, type Readable, type Writable } from 'svelte/store';
import { type BaseLand, EmptyLand } from './land';
import type { ParsedEntity } from '@dojoengine/sdk';
import type { Auction, Land, LandStake, SchemaType } from '$lib/models.gen';
import { toLocation, type Location } from './land/location';
import { BuildingLand } from './land/building_land';
import { AuctionLand } from './land/auction';
import { Building } from 'lucide-svelte';
import { setupInitialLands, setupLandsSubscription } from './land/torii';
import type { Client } from '$lib/contexts/client.svelte';

type WrappedLand = Writable<{ value: BaseLand }>;

function wrapLand(land: BaseLand): WrappedLand {
  return writable({ value: land });
}

function getLocationFromEntity(
  entity: ParsedEntity<SchemaType>,
): Location | undefined {
  if (entity.models.ponzi_land?.Land !== undefined) {
    const { location } = entity.models.ponzi_land.Land;
    return toLocation(location);
  } else if (entity.models.ponzi_land?.LandStake !== undefined) {
    const { location } = entity.models.ponzi_land.LandStake;
    return toLocation(location);
  } else if (entity.models.ponzi_land?.Auction !== undefined) {
    const { land_location } = entity.models.ponzi_land.Auction;
    return toLocation(land_location);
  } else {
    return undefined;
  }
}

export class LandTileStore {
  private store: WrappedLand[][];
  private pendingStake: Map<Location, LandStake> = new Map();

  constructor() {
    // Put empty lands everywhere.
    this.store = Array(GRID_SIZE)
      .fill(null)
      .map((_, x) =>
        Array(GRID_SIZE)
          .fill(null)
          .map((_, y) => wrapLand(new EmptyLand({ x, y }))),
      );
  }

  public async setup(client: Client) {
    await setupLandsSubscription(client, (lands) => {
      this.setEntities(lands);
    });

    await setupInitialLands(client, (entities) => {
      this.setEntities(entities);
    });
  }

  public getLand(x: number, y: number): Readable<BaseLand> | undefined {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return undefined;
    return derived([this.store[x][y]], ([land]) => land.value);
  }

  private setEntities(entities: ParsedEntity<SchemaType>[]) {
    // For each land, update.
    entities.forEach((entity) => {
      this.updateLand(entity);
    });
  }

  private updateLand(entity: ParsedEntity<SchemaType>): void {
    const location = getLocationFromEntity(entity);
    if (location === undefined) return;

    // TODO: Handle the land being deleted, but that requires a more complex logic (mapping from/to the hashed location)
    const landStore = this.store[location.x][location.y];
    landStore.update(({ value: land }) => {
      const landModel = entity.models.ponzi_land?.Land;
      console.log('Updating land at', location, entity);

      if (landModel !== undefined && Object.keys(landModel).length === 0) {
        // Land model is being deleted, delete the entire land
        return { value: new EmptyLand(location) };
      }

      if (EmptyLand.is(land) && landModel == undefined) {
        return { value: land };
      }

      // If we get an auction, go ahead with the auction
      const auctionModel = entity.models.ponzi_land?.Auction;
      if (auctionModel !== undefined && auctionModel.is_finished == false) {
        if (AuctionLand.is(land)) {
          land.update(auctionModel as Auction);
          return { value: land };
        } else {
          return { value: new AuctionLand(auctionModel as Auction) };
        }
      }

      const landStakeModel = entity.models.ponzi_land?.LandStake;
      let newLand = land;

      if (landModel !== undefined) {
        if (AuctionLand.is(newLand) && Number(landModel.owner) == 0) {
          // Do not change the land, this is an empty update.
          return { value: land };
        } else if (BuildingLand.is(newLand)) {
          newLand.update(landModel as Land);
        } else {
          newLand = new BuildingLand(landModel as Land);
          // Check if we have a pending stake
          if (this.pendingStake.has(newLand.location)) {
            const pendingStake = this.pendingStake.get(newLand.location)!;
            (newLand as BuildingLand).updateStake(pendingStake);
            this.pendingStake.delete(newLand.location);
          }
        }
      }

      if (landStakeModel !== undefined) {
        if (BuildingLand.is(newLand)) {
          newLand.updateStake(landStakeModel as LandStake);
        } else {
          this.pendingStake.set(newLand.location, landStakeModel as LandStake);
        }
      }

      // Do nothing
      return { value: newLand };
    });
  }
}
