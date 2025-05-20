import { GRID_SIZE } from '$lib/const';
import type { Client } from '$lib/contexts/client.svelte';
import type { Auction, Land, LandStake, SchemaType } from '$lib/models.gen';
import { nukeStore } from '$lib/stores/nuke.store.svelte';
import type { ParsedEntity } from '@dojoengine/sdk';
import type { Subscription } from '@dojoengine/torii-client';
import { derived, writable, type Readable, type Writable } from 'svelte/store';
import { EmptyLand, type BaseLand } from './land';
import { AuctionLand } from './land/auction_land';
import { BuildingLand } from './land/building_land';
import { toLocation, type Location } from './land/location';
import { setupLandsSubscription } from './land/torii';

// Constants for random updates
const MIN_RANDOM_UPDATES = 20;
const MAX_RANDOM_UPDATES = 50;
const RANDOM_UPDATE_RANGE = MAX_RANDOM_UPDATES - MIN_RANDOM_UPDATES;

const UPDATE_INTERVAL = 100;
const NUKE_RATE = 0.1;

// Token addresses
const TOKEN_ADDRESSES = [
  '0x071de745c1ae996cfd39fb292b4342b7c086622e3ecf3a5692bd623060ff3fa0',
  '0x0335e87d03baaea788b8735ea0eac49406684081bb669535bb7074f9d3f66825',
  '0x04230d6e1203e0d26080eb1cf24d1a3708b8fc085a7e0a4b403f8cc4ec5f7b7b',
  '0x07031b4db035ffe8872034a97c60abd4e212528416f97462b1742e1f6cf82afe',
  '0x01d321fcdb8c0592760d566b32b707a822b5e516e87e54c85b135b0c030b1706',
];

// Default values
const DEFAULT_SELL_PRICE = 1000;
const DEFAULT_STAKE_AMOUNT = 1000;
const DEFAULT_OWNER =
  '0x05144466224fde5d648d6295a2fb6e7cd45f2ca3ede06196728026f12c84c9ff';

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
  private currentLands: Writable<BaseLand[][]>;
  private allLands: Readable<BaseLand[]>;
  private pendingStake: Map<Location, LandStake> = new Map();
  private sub: Subscription | undefined;
  private updateTracker: Writable<number> = writable(0);
  private fakeUpdateInterval: NodeJS.Timeout | undefined;

  constructor() {
    // Put empty lands everywhere.
    this.store = Array(GRID_SIZE)
      .fill(null)
      .map((_, x) =>
        Array(GRID_SIZE)
          .fill(null)
          .map((_, y) => wrapLand(new EmptyLand({ x, y }))),
      );

    // Initialize currentLands with EmptyLand copies as a writable store
    this.currentLands = writable(
      Array(GRID_SIZE)
        .fill(null)
        .map((_, x) =>
          Array(GRID_SIZE)
            .fill(null)
            .map((_, y) => new EmptyLand({ x, y })),
        ),
    );

    this.allLands = derived(this.currentLands, (lands) => {
      console.log('lands updated', lands);
      return lands.flat();
    });
  }

  public async setup(client: Client) {
    if (this.sub) {
      this.sub.cancel();
      this.sub = undefined;
    }

    const { initialEntities, subscription } = await setupLandsSubscription(
      client,
      (lands) => {
        this.setEntities(lands);
      },
    );

    // Setup the initial lands
    this.setEntities(initialEntities);

    // Store the subscription
    this.sub = subscription;
  }

  private randomLandUpdate() {
    // Update between 20 to 100 random lands
    const numUpdates =
      Math.floor(Math.random() * RANDOM_UPDATE_RANGE) + MIN_RANDOM_UPDATES;

    this.currentLands.update((lands) => {
      for (let i = 0; i < numUpdates; i++) {
        // Pick a random land
        const x = Math.floor(Math.random() * GRID_SIZE);
        const y = Math.floor(Math.random() * GRID_SIZE);
        const location = { x, y };

        // Randomly select a token
        const randomToken =
          TOKEN_ADDRESSES[Math.floor(Math.random() * TOKEN_ADDRESSES.length)];

        // Create a random update
        const fakeLand: Land = {
          owner: DEFAULT_OWNER,
          location: x + y * GRID_SIZE,
          block_date_bought: Date.now(),
          sell_price:
            Math.floor(Math.random() * DEFAULT_SELL_PRICE) +
            DEFAULT_SELL_PRICE / 2,
          token_used: randomToken,
          // @ts-ignore
          level: 'Second',
        };

        const fakeStake: LandStake = {
          location: x + y * GRID_SIZE,
          amount:
            Math.floor(Math.random() * DEFAULT_STAKE_AMOUNT) +
            DEFAULT_STAKE_AMOUNT / 2,
          last_pay_time: Date.now(),
        };

        const buildingLand = new BuildingLand(fakeLand);
        buildingLand.updateStake(fakeStake);

        this.store[x][y].set({ value: buildingLand });
        lands[x][y] = buildingLand;

        // Randomly trigger nuke animation (50% chance)
        if (Math.random() < NUKE_RATE) {
          this.triggerNukeAnimation(x, y);
        }
      }
      return lands;
    });
  }

  private triggerNukeAnimation(x: number, y: number) {
    const location = x + y * GRID_SIZE;
    // Mark the land as nuking
    nukeStore.nuking[location] = true;

    // Clear the nuking state after animation duration (3.5 seconds)
    setTimeout(() => {
      nukeStore.nuking[location] = false;
    }, 3500);
  }

  public fakeSetup() {
    this.currentLands.update((lands) => {
      // Create level 3 building lands for the entire grid
      for (let x = 0; x < GRID_SIZE; x++) {
        for (let y = 0; y < GRID_SIZE; y++) {
          const location = { x, y };
          // Randomly select a token
          const randomToken =
            TOKEN_ADDRESSES[Math.floor(Math.random() * TOKEN_ADDRESSES.length)];
          const fakeLand: Land = {
            owner: DEFAULT_OWNER,
            location: x + y * GRID_SIZE,
            block_date_bought: Date.now(),
            sell_price:
              Math.floor(Math.random() * DEFAULT_SELL_PRICE) +
              DEFAULT_SELL_PRICE / 2,
            token_used: randomToken,
            // @ts-ignore
            level: 'Second',
          };

          const fakeStake: LandStake = {
            location: x + y * GRID_SIZE,
            amount:
              Math.floor(Math.random() * DEFAULT_STAKE_AMOUNT) +
              DEFAULT_STAKE_AMOUNT / 2,
            last_pay_time: Date.now(),
          };

          const buildingLand = new BuildingLand(fakeLand);
          buildingLand.updateStake(fakeStake);

          this.store[x][y].set({ value: buildingLand });
          console.log('Setting land at', location, buildingLand);
          lands[x][y] = buildingLand;
        }
      }
      return lands;
    });

    // Start random updates every 10ms
    this.fakeUpdateInterval = setInterval(() => {
      this.randomLandUpdate();
    }, UPDATE_INTERVAL);
  }

  public cleanup() {
    if (this.fakeUpdateInterval) {
      clearInterval(this.fakeUpdateInterval);
      this.fakeUpdateInterval = undefined;
    }
    if (this.sub) {
      this.sub.cancel();
      this.sub = undefined;
    }
  }

  public getLand(x: number, y: number): Readable<BaseLand> | undefined {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return undefined;
    return derived([this.store[x][y]], ([land]) => land.value);
  }

  public getAllLands(): Readable<BaseLand[]> {
    return this.allLands;
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
          land.update(landModel as Land, auctionModel as Auction);
          return { value: land };
        } else if (landModel) {
          return {
            value: new AuctionLand(landModel as Land, auctionModel as Auction),
          };
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

      this.currentLands.update((lands) => {
        lands[location.x][location.y] = newLand;
        return lands;
      });

      return { value: newLand };
    });
  }
}
