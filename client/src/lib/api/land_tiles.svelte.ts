import { DEFAULT_TIMEOUT } from '$lib/const';
import { config } from '$lib/stores/config.store.svelte';
import type { Client } from '$lib/contexts/client.svelte';
import type { Auction, Land, LandStake, SchemaType } from '$lib/models.gen';
import { gameSounds } from '$lib/stores/sfx.svelte';
import { claimStore } from '$lib/stores/claim.store.svelte';
import { nukeStore } from '$lib/stores/nuke.store.svelte';
import { createLandWithActions } from '$lib/utils/land-actions';
import type { ParsedEntity } from '@dojoengine/sdk';
import type { Subscription } from '@dojoengine/torii-client';
import { derived, writable, type Readable, type Writable } from 'svelte/store';
import { EmptyLand, type BaseLand } from './land';
import { AuctionLand } from './land/auction_land';
import { BuildingLand } from './land/building_land';
import { toLocation, type Location } from './land/location';
import { setupLandsSubscription } from './land/torii';
import { waitForLandChange, waitForLandType } from './storeWait';
import { padAddress } from '$lib/utils';

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
    return toLocation(location ?? 0);
  } else if (entity.models.ponzi_land?.LandStake !== undefined) {
    const { location } = entity.models.ponzi_land.LandStake;
    return toLocation(location ?? 0);
  } else if (entity.models.ponzi_land?.Auction !== undefined) {
    const { land_location } = entity.models.ponzi_land.Auction;
    return toLocation(land_location ?? 0);
  } else {
    return undefined;
  }
}

export class LandTileStore {
  private store: WrappedLand[][];
  private currentLands: Writable<BaseLand[][]>;
  private allLands: Readable<BaseLand[]>;
  private pendingStake: Map<string, LandStake> = new Map(); // Use string key for better lookup
  private sub: Subscription | undefined;
  private updateTracker: Writable<number> = writable(0);
  private fakeUpdateInterval: NodeJS.Timeout | undefined;

  constructor() {
    // Put empty lands everywhere.
    const GRID_SIZE = config.GRID_SIZE();
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

    const GRID_SIZE = config.GRID_SIZE;
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
    const GRID_SIZE = config.GRID_SIZE;
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
          lands[x][y] = buildingLand;
        }
      }
      return lands;
    });
  }

  public startRandomUpdates() {
    this.fakeUpdateInterval = setInterval(() => {
      this.randomLandUpdate();
    }, UPDATE_INTERVAL);
  }

  public stopRandomUpdates() {
    if (this.fakeUpdateInterval) {
      clearInterval(this.fakeUpdateInterval);
      this.fakeUpdateInterval = undefined;
    }
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
    const GRID_SIZE = config.GRID_SIZE;
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

  // Helper method to get pending stake key
  private getPendingStakeKey(location: Location): string {
    return `${location.x}-${location.y}`;
  }

  // Helper method to check and apply pending stake
  private checkAndApplyPendingStake(
    land: BuildingLand,
    location: Location,
  ): BuildingLand {
    const pendingStakeKey = this.getPendingStakeKey(location);
    const pendingStake = this.pendingStake.get(pendingStakeKey);

    if (pendingStake) {
      console.log(
        'Applying pending stake for location',
        location,
        pendingStake,
      );
      land.updateStake(pendingStake);
      this.pendingStake.delete(pendingStakeKey);
    }

    return land;
  }

  public updateLand(entity: ParsedEntity<SchemaType>): void {
    const location = getLocationFromEntity(entity);
    if (location === undefined) return;

    console.log('Updating land', entity);

    const landStore = this.store[location.x][location.y];
    const pendingStakeKey = this.getPendingStakeKey(location);

    landStore.update(({ value: previousLand }) => {
      const landModel = entity.models.ponzi_land?.Land;
      const auctionModel = entity.models.ponzi_land?.Auction;
      const landStakeModel = entity.models.ponzi_land?.LandStake;

      // Handle land deletion
      if (landModel !== undefined && Object.keys(landModel).length === 0) {
        // Land model is being deleted, delete the entire land
        const newLand = new EmptyLand(location);
        // Clear any pending stake for this location
        this.pendingStake.delete(pendingStakeKey);
        this.currentLands.update((lands) => {
          lands[location.x][location.y] = newLand;
          return lands;
        });
        return { value: newLand };
      }

      // Handle empty land case
      if (EmptyLand.is(previousLand) && landModel == undefined) {
        // If we only have a stake update for an empty land, store it as pending
        if (landStakeModel !== undefined) {
          console.log(
            'Storing stake for empty land at location',
            location,
            landStakeModel,
          );
          this.pendingStake.set(pendingStakeKey, landStakeModel as LandStake);
        }

        this.currentLands.update((lands) => {
          lands[location.x][location.y] = previousLand;
          return lands;
        });
        return { value: previousLand };
      }

      // Handle auction case
      if (auctionModel !== undefined && auctionModel.is_finished == false) {
        let newLand: AuctionLand;

        if (AuctionLand.is(previousLand)) {
          previousLand.update(landModel as Land, auctionModel as Auction);
          newLand = previousLand;
        } else if (landModel !== undefined) {
          newLand = new AuctionLand(landModel as Land, auctionModel as Auction);
        } else {
          newLand = new AuctionLand(previousLand, auctionModel as Auction);
          // Nuke the land
          gameSounds.play('nuke');
          setTimeout(
            () => this.triggerNukeAnimation(location.x, location.y),
            1000,
          );
        }

        this.currentLands.update((lands) => {
          lands[location.x][location.y] = newLand;
          return lands;
        });
        return { value: newLand };
      }

      let newLand = previousLand;

      // Handle land model updates
      if (landModel !== undefined) {
        if (AuctionLand.is(newLand) && Number(landModel.owner) == 0) {
          // Do not change the land, this is an empty update.
          return { value: previousLand };
        } else {
          // Create new BuildingLand
          newLand = new BuildingLand(landModel as Land);

          // First, check for pending stake and apply it
          newLand = this.checkAndApplyPendingStake(
            newLand as BuildingLand,
            location,
          );

          // Then, if we have a current stake update, apply it (this will override pending stake)
          if (landStakeModel !== undefined) {
            console.log('Applying current stake update', landStakeModel);
            (newLand as BuildingLand).updateStake(landStakeModel as LandStake);
          } else if (
            BuildingLand.is(previousLand) &&
            previousLand.stakeAmount
          ) {
            // If no new stake but previous land had stake, preserve it
            (newLand as BuildingLand).updateStake({
              location: landModel.location,
              amount: previousLand.stakeAmount.toBigint(),
              last_pay_time: previousLand.lastPayTime.getTime(),
            } as LandStake);
          }

          console.log('New land created', newLand);
        }
      } else if (landStakeModel !== undefined) {
        // We only have a stake update
        if (BuildingLand.is(newLand)) {
          // Apply stake to existing BuildingLand
          console.log(
            'Updating stake on existing BuildingLand',
            landStakeModel,
          );
          newLand.updateStake(landStakeModel as LandStake);
          newLand = BuildingLand.fromBuildingLand(newLand);
        } else {
          // Store stake as pending since we don't have a BuildingLand yet
          console.log(
            'Storing pending stake for non-BuildingLand',
            location,
            landStakeModel,
          );
          this.pendingStake.set(pendingStakeKey, landStakeModel as LandStake);
          // Return early, no land change needed
          return { value: previousLand };
        }
      }

      // Update claim store for BuildingLand
      if (BuildingLand.is(newLand)) {
        claimStore.value[newLand.locationString] = {
          lastClaimTime: 0,
          animating: false,
          land: createLandWithActions(newLand, () => this.getAllLands()),
          claimable: true,
        };
      }

      // Update the currentLands store
      this.currentLands.update((lands) => {
        lands[location.x][location.y] = newLand;
        return lands;
      });

      return { value: newLand };
    });
  }

  public updateLandDirectly(x: number, y: number, land: BaseLand): void {
    const GRID_SIZE = config.GRID_SIZE;
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return;

    this.store[x][y].set({ value: land });
    this.currentLands.update((lands) => {
      lands[x][y] = land;
      return lands;
    });
  }

  // Wait for a specific land to change
  async waitForLandChange(
    x: number,
    y: number,
    predicate: (land: BaseLand) => boolean,
    timeout: number = DEFAULT_TIMEOUT,
  ): Promise<BaseLand> {
    const landStore = this.getLand(x, y);
    if (!landStore) {
      throw new Error(`Invalid land coordinates: ${x}, ${y}`);
    }
    return waitForLandChange(landStore, predicate, timeout);
  }

  // Wait for land to become a specific type
  async waitForLandType<T extends BaseLand>(
    x: number,
    y: number,
    typeChecker: (land: BaseLand) => land is T,
    timeout: number = DEFAULT_TIMEOUT,
  ): Promise<T> {
    const landStore = this.getLand(x, y);
    if (!landStore) {
      throw new Error(`Invalid land coordinates: ${x}, ${y}`);
    }
    return waitForLandType(landStore, typeChecker, timeout);
  }

  // Wait for land owner to change
  async waitForOwnerChange(
    x: number,
    y: number,
    expectedOwner: string,
    timeout: number = DEFAULT_TIMEOUT,
  ): Promise<BaseLand> {
    return this.waitForLandChange(
      x,
      y,
      (land) =>
        'owner' in land && padAddress(land.owner) === padAddress(expectedOwner),
      timeout,
    );
  }

  // Wait for land to become empty
  async waitForEmptyLand(
    x: number,
    y: number,
    timeout: number = DEFAULT_TIMEOUT,
  ): Promise<BaseLand> {
    return this.waitForLandChange(
      x,
      y,
      (land) => land.constructor.name === 'EmptyLand',
      timeout,
    );
  }

  // Wait for land to become a building
  async waitForBuildingLand(
    x: number,
    y: number,
    timeout: number = DEFAULT_TIMEOUT,
  ): Promise<BaseLand> {
    return this.waitForLandChange(
      x,
      y,
      (land) => land.constructor.name === 'BuildingLand',
      timeout,
    );
  }

  // Wait for auction to finish
  async waitForAuctionEnd(
    x: number,
    y: number,
    timeout: number = DEFAULT_TIMEOUT,
  ): Promise<BaseLand> {
    return this.waitForLandChange(
      x,
      y,
      (land) => land.constructor.name !== 'AuctionLand',
      timeout,
    );
  }

  // Wait for stake amount to reach a certain threshold
  async waitForStakeThreshold(
    x: number,
    y: number,
    minStakeAmount: number,
    timeout: number = DEFAULT_TIMEOUT,
  ): Promise<BaseLand> {
    return this.waitForLandChange(
      x,
      y,
      (land) => {
        if ('stakeAmount' in land && land.stakeAmount) {
          return Number(land.stakeAmount) >= minStakeAmount;
        }
        return false;
      },
      timeout,
    );
  }

  // Wait for any land in the grid to change
  async waitForAnyLandChange(
    predicate: (land: BaseLand) => boolean,
    timeout: number = DEFAULT_TIMEOUT,
  ): Promise<{ land: BaseLand; x: number; y: number }> {
    const allLandsStore = this.getAllLands();

    return new Promise((resolve, reject) => {
      let timeoutId: NodeJS.Timeout;
      let unsubscribe: (() => void) | undefined;

      timeoutId = setTimeout(() => {
        if (unsubscribe) {
          unsubscribe();
        }
        reject(new Error(`Wait timeout after ${timeout}ms`));
      }, timeout);

      unsubscribe = allLandsStore.subscribe((lands: BaseLand[]) => {
        for (let i = 0; i < lands.length; i++) {
          const land = lands[i];
          if (predicate(land)) {
            const GRID_SIZE = config.GRID_SIZE;
            const x = i % GRID_SIZE;
            const y = Math.floor(i / GRID_SIZE);

            clearTimeout(timeoutId);
            if (unsubscribe) {
              unsubscribe();
            }
            resolve({ land, x, y });
            return;
          }
        }
      });
    });
  }
}
