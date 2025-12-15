import { devsettings } from '$lib/components/+game-map/three/utils/devsettings.store.svelte';
import { DEFAULT_TIMEOUT, GRID_SIZE } from '$lib/const';
import type { Client } from '$lib/contexts/client.svelte';
import type { Auction, Land, LandStake, SchemaType } from '$lib/models.gen';
import { claimStore } from '$lib/stores/claim.store.svelte';
import { nukeStore } from '$lib/stores/nuke.store.svelte';
import { gameSounds } from '$lib/stores/sfx.svelte';
import {
  coordinatesToLocation,
  locationToCoordinates,
  padAddress,
} from '$lib/utils';
import { logEntityUpdate } from '$lib/utils/entity-logger';
import { createLandWithActions } from '$lib/utils/land-actions';
import data from '$profileData';
import type { ParsedEntity } from '@dojoengine/sdk';
import { CairoOption, CairoOptionVariant } from 'starknet';
import {
  derived,
  readable,
  writable,
  type Readable,
  type Writable,
} from 'svelte/store';
import { EmptyLand, type BaseLand } from './land';
import { AuctionLand } from './land/auction_land';
import { BuildingLand } from './land/building_land';
import { toLocation, type Location } from './land/location';
import { setupLandsSubscription } from './land/torii';
import { waitForLandChange, waitForLandType } from './storeWait';
import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
import { getTokenMetadata } from '$lib/tokens';
import type { Token } from '$lib/interfaces';
import type { LandHistoricalResponse } from '$lib/spectator/spectator.service';
import type { ReplayEvent } from '$lib/spectator/replay-engine';

type Subscription = Awaited<
  ReturnType<typeof setupLandsSubscription>
>['subscription'];

const TOKEN_ADDRESSES = data.availableTokens.map(
  (token) => token.address,
) as string[];

// Default values
const DEFAULT_SELL_PRICE = 1000000000000000000;
const TUTORIAL_BASE_PRICE = 100000000000000000000; // ~$100 worth in base currency
const DEFAULT_STAKE_AMOUNT = 1000000000000000000;
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
  private allLands: Readable<BaseLand[]> = readable([]);
  private pendingStake: Map<string, LandStake> = new Map(); // Use string key for better lookup
  private sub: Subscription | undefined;
  private updateTracker: Writable<number> = writable(0);
  private fakeUpdateInterval: NodeJS.Timeout | undefined;
  private ownershipIndex: Map<string, Set<number>> = new Map(); // Owner address -> land indices
  private ownershipIndexStore: Writable<Map<string, number[]>> = writable(
    new Map(),
  );
  private ownershipUpdatePending = false;

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
      return lands.flat();
    });
  }

  public async setup(client: Client) {
    // Reset all values to their initial state
    this.store = Array(GRID_SIZE)
      .fill(null)
      .map((_, x) =>
        Array(GRID_SIZE)
          .fill(null)
          .map((_, y) => wrapLand(new EmptyLand({ x, y }))),
      );

    this.currentLands.set(
      Array(GRID_SIZE)
        .fill(null)
        .map((_, x) =>
          Array(GRID_SIZE)
            .fill(null)
            .map((_, y) => new EmptyLand({ x, y })),
        ),
    );

    // allLands is a derived store, so no need to reset
    this.pendingStake.clear();
    this.ownershipIndex.clear();
    this.ownershipIndexStore.set(new Map());
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
    // Use devsettings for update range and nuke rate
    const minUpdates = devsettings.minRandomUpdates;
    const maxUpdates = devsettings.maxRandomUpdates;
    const nukeRate = devsettings.nukeRate;
    const randomUpdateRange = maxUpdates - minUpdates;
    const numUpdates =
      Math.floor(Math.random() * randomUpdateRange) + minUpdates;

    this.currentLands.update((lands) => {
      for (let i = 0; i < numUpdates; i++) {
        // Pick a random land
        const x = Math.floor(Math.random() * GRID_SIZE);
        const y = Math.floor(Math.random() * GRID_SIZE);
        const location = { x, y };

        // Randomly select a token
        const randomToken =
          TOKEN_ADDRESSES[Math.floor(Math.random() * TOKEN_ADDRESSES.length)];

        const levels = ['Zero', 'First', 'Second'];
        const randomLevel = levels[Math.floor(Math.random() * levels.length)];

        // Create a random update
        const fakeLand: Land = {
          owner: DEFAULT_OWNER,
          location: coordinatesToLocation({ x, y }),
          block_date_bought: Date.now() / 1000,
          sell_price:
            Math.floor(Math.random() * DEFAULT_SELL_PRICE) +
            DEFAULT_SELL_PRICE / 2,
          token_used: randomToken,
          // @ts-ignore
          level: randomLevel,
        };

        const fakeStake: LandStake = {
          location: coordinatesToLocation({ x, y }),
          amount:
            Math.floor(Math.random() * DEFAULT_STAKE_AMOUNT) +
            DEFAULT_STAKE_AMOUNT / 2,
          neighbors_info_packed: 0,
          accumulated_taxes_fee: 0,
        };

        const buildingLand = new BuildingLand(fakeLand);
        buildingLand.updateStake(fakeStake);

        if (BuildingLand.is(buildingLand)) {
          claimStore.value[buildingLand.locationString] = {
            animating: false,
            land: createLandWithActions(buildingLand, () => this.getAllLands()),
            claimable: true,
          };
        }

        // Update ownership index for random updates (use regular method for individual updates)
        this.updateOwnershipIndex({ x, y }, lands[x][y], buildingLand);

        this.store[x][y].set({ value: buildingLand });
        lands[x][y] = buildingLand;

        // Randomly trigger nuke animation
        if (Math.random() < nukeRate) {
          this.triggerNukeAnimation(x, y);
        }
      }
      return lands;
    });
  }

  private triggerNukeAnimation(x: number, y: number) {
    const location = coordinatesToLocation({ x, y });
    nukeStore.animationManager.triggerAnimation(location.toString());
  }

  public fakeSetup() {
    this.currentLands.update((lands) => {
      // Create level 3 building lands for the entire grid
      for (let x = 0; x < GRID_SIZE; x++) {
        for (let y = 0; y < GRID_SIZE; y++) {
          // Randomly select a token
          const randomToken =
            TOKEN_ADDRESSES[Math.floor(Math.random() * TOKEN_ADDRESSES.length)];
          const fakeLand: Land = {
            owner: DEFAULT_OWNER,
            location: coordinatesToLocation({ x, y }),
            block_date_bought: Date.now() / 1000,
            sell_price:
              Math.floor(Math.random() * DEFAULT_SELL_PRICE) +
              DEFAULT_SELL_PRICE / 2,
            token_used: randomToken,
            // @ts-ignore
            level: 'Second',
          };

          const fakeStake: LandStake = {
            location: coordinatesToLocation({ x, y }),
            amount:
              Math.floor(Math.random() * DEFAULT_STAKE_AMOUNT) +
              DEFAULT_STAKE_AMOUNT / 2,
            neighbors_info_packed: 0,
            accumulated_taxes_fee: 0,
          };

          const buildingLand = new BuildingLand(fakeLand);
          buildingLand.updateStake(fakeStake);

          // Update ownership index for the new building land (bulk mode)
          this.updateOwnershipIndexBulk({ x, y }, lands[x][y], buildingLand);

          this.store[x][y].set({ value: buildingLand });
          lands[x][y] = buildingLand;
        }
      }
      // Force update at end of bulk operation
      this.forceOwnershipUpdate();
      return lands;
    });
  }

  public palette() {
    this.currentLands.update((lands) => {
      const levels = ['Zero', 'First', 'Second'];
      const totalTokens = TOKEN_ADDRESSES.length;
      const totalLevels = levels.length;

      // Calculate dimensions needed for the palette
      const paletteWidth = totalTokens;
      const paletteHeight = totalLevels;

      // Calculate starting position to center the palette
      const startX = Math.floor((GRID_SIZE - paletteWidth) / 2);
      const startY = Math.floor((GRID_SIZE - paletteHeight) / 2);

      // First, fill entire grid with empty lands
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          const location = { x, y };
          const emptyLand = new EmptyLand(location);
          this.store[x][y].set({ value: emptyLand });
          lands[x][y] = emptyLand;
        }
      }

      // Create the palette in the center
      let buildingCount = 0;

      // Levels from top to bottom (y-axis)
      for (let levelIndex = 0; levelIndex < totalLevels; levelIndex++) {
        // Tokens from left to right (x-axis)
        for (let tokenIndex = 0; tokenIndex < totalTokens; tokenIndex++) {
          const x = startX + tokenIndex;
          const y = startY + levelIndex;

          // Make sure we're within grid bounds
          if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
            const token = TOKEN_ADDRESSES[tokenIndex];
            const level = levels[levelIndex];

            // Create building land with specific token and level
            const fakeLand: Land = {
              owner: DEFAULT_OWNER,
              location: coordinatesToLocation({ x, y }),
              block_date_bought: Date.now() / 1000,
              sell_price: DEFAULT_SELL_PRICE + buildingCount * 100, // Vary prices slightly
              token_used: token,
              // @ts-ignore
              level: level,
            };

            const fakeStake: LandStake = {
              location: coordinatesToLocation({ x, y }),
              amount: DEFAULT_STAKE_AMOUNT + buildingCount * 50, // Vary stake amounts
              accumulated_taxes_fee: 0,
              neighbors_info_packed: 0,
            };

            const buildingLand = new BuildingLand(fakeLand);
            buildingLand.updateStake(fakeStake);

            // Update ownership index for the new building land (bulk mode)
            this.updateOwnershipIndexBulk({ x, y }, lands[x][y], buildingLand);

            this.store[x][y].set({ value: buildingLand });
            lands[x][y] = buildingLand;

            buildingCount++;
          }
        }
      }

      // Add one auction land right after the palette
      const auctionX = startX + totalTokens;
      const auctionY = startY;

      if (auctionX < GRID_SIZE && auctionY < GRID_SIZE) {
        const auctionToken = TOKEN_ADDRESSES[0];
        const auctionLevel = levels[0];

        const auctionLandData: Land = {
          owner: DEFAULT_OWNER,
          location: coordinatesToLocation({ x: auctionX, y: auctionY }),
          block_date_bought: Date.now() / 1000,
          sell_price: DEFAULT_SELL_PRICE,
          token_used: auctionToken,
          // @ts-ignore
          level: auctionLevel,
        };

        const auctionData: Auction = {
          land_location: coordinatesToLocation({ x: auctionX, y: auctionY }),
          start_time: Date.now() / 1000,
          start_price: '',
          floor_price: '',
          is_finished: false,
          sold_at_price: 0 as any,
        };

        const auctionLand = new AuctionLand(auctionLandData, auctionData);

        this.store[auctionX][auctionY].set({ value: auctionLand });
        lands[auctionX][auctionY] = auctionLand;
      }

      // Force update at end of bulk operation
      this.forceOwnershipUpdate();

      return lands;
    });
  }

  public startRandomUpdates() {
    this.fakeUpdateInterval = setInterval(() => {
      this.randomLandUpdate();
    }, devsettings.updateInterval);
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
    // Clean up all nuke animations
    nukeStore.animationManager.clearAllAnimations();
    this.ownershipIndex.clear();
    this.ownershipIndexStore.set(new Map());
  }

  public getLand(x: number, y: number): Readable<BaseLand> | undefined {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return undefined;
    return derived([this.store[x][y]], ([land]) => land.value);
  }

  public getCurrentLands(): Readable<BaseLand[][]> {
    return this.currentLands;
  }

  public getAllLands(): Readable<BaseLand[]> {
    return this.allLands;
  }

  public getOwnedLandIndices(
    ownerAddress: string | undefined,
    limit?: number,
  ): number[] {
    if (!ownerAddress) return [];

    const normalizedAddress = padAddress(ownerAddress);
    const indicesSet = this.ownershipIndex.get(normalizedAddress ?? '');
    if (!indicesSet) return [];

    const indices = Array.from(indicesSet);
    return limit ? indices.slice(0, limit) : indices;
  }

  public getOwnedLandIndicesStore(
    ownerAddress: string | undefined,
    limit?: number,
  ): Readable<number[]> {
    return derived(this.ownershipIndexStore, (ownershipMap) => {
      if (!ownerAddress) return [];

      const normalizedAddress = padAddress(ownerAddress);
      const indices = ownershipMap.get(normalizedAddress ?? '') || [];
      return limit ? indices.slice(0, limit) : indices;
    });
  }

  public getOwnershipIndexStore(): Readable<Map<string, number[]>> {
    return this.ownershipIndexStore;
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
      land.updateStake(pendingStake);
      this.pendingStake.delete(pendingStakeKey);
    }

    return land;
  }

  // Helper method to schedule ownership index store update
  private scheduleOwnershipUpdate(): void {
    if (!this.ownershipUpdatePending) {
      this.ownershipUpdatePending = true;
      // Use microtask to batch multiple updates in the same synchronous execution
      Promise.resolve().then(() => {
        this.ownershipUpdatePending = false;
        // Convert Sets to Arrays for the reactive store
        this.ownershipIndexStore.update((currentMap) => {
          currentMap.clear();
          for (const [owner, landSet] of this.ownershipIndex) {
            currentMap.set(owner, Array.from(landSet));
          }
          return currentMap;
        });
      });
    }
  }

  // Helper method to force immediate ownership update (for end of bulk operations)
  private forceOwnershipUpdate(): void {
    if (this.ownershipUpdatePending) {
      this.ownershipUpdatePending = false;
    }
    // Convert Sets to Arrays for the reactive store
    this.ownershipIndexStore.update((currentMap) => {
      currentMap.clear();
      for (const [owner, landSet] of this.ownershipIndex) {
        currentMap.set(owner, Array.from(landSet));
      }
      return currentMap;
    });
  }

  // Helper method for bulk ownership updates - doesn't trigger reactive updates until end
  private updateOwnershipIndexBulk(
    location: Location,
    oldLand: BaseLand,
    newLand: BaseLand,
  ): void {
    // Fix coordinate transposition: use x * GRID_SIZE + y instead of y * GRID_SIZE + x
    const landIndex = location.x * GRID_SIZE + location.y;

    // Get old and new owners
    const oldOwner =
      BuildingLand.is(oldLand) && oldLand.owner && oldLand.owner.length > 0
        ? padAddress(oldLand.owner)
        : null;
    const newOwner =
      BuildingLand.is(newLand) && newLand.owner && newLand.owner.length > 0
        ? padAddress(newLand.owner)
        : null;

    // Always remove from old owner's index if there was one
    // This handles: owner change, land becoming empty, land being deleted
    if (oldOwner) {
      const oldIndices = this.ownershipIndex.get(oldOwner);
      if (oldIndices) {
        oldIndices.delete(landIndex);
        // Clean up empty owner entries
        if (oldIndices.size === 0) {
          this.ownershipIndex.delete(oldOwner);
        }
      }
    }

    // Add to new owner's index if there is a new owner
    // This handles: new ownership, ownership change
    if (newOwner) {
      let currentIndices = this.ownershipIndex.get(newOwner);
      if (!currentIndices) {
        currentIndices = new Set<number>();
        this.ownershipIndex.set(newOwner, currentIndices);
      }
      currentIndices.add(landIndex);
    }

    // Don't schedule update - caller will handle it
  }

  // Helper method to update ownership index
  private updateOwnershipIndex(
    location: Location,
    oldLand: BaseLand,
    newLand: BaseLand,
  ): void {
    const landIndex = coordinatesToLocation(location);

    // Get old and new owners
    const oldOwner =
      BuildingLand.is(oldLand) && oldLand.owner && oldLand.owner.length > 0
        ? padAddress(oldLand.owner)
        : null;
    const newOwner =
      BuildingLand.is(newLand) && newLand.owner && newLand.owner.length > 0
        ? padAddress(newLand.owner)
        : null;

    // Always remove from old owner's index if there was one
    // This handles: owner change, land becoming empty, land being deleted
    if (oldOwner) {
      const oldIndices = this.ownershipIndex.get(oldOwner);
      if (oldIndices) {
        oldIndices.delete(landIndex);
        // Clean up empty owner entries
        if (oldIndices.size === 0) {
          this.ownershipIndex.delete(oldOwner);
        }
      }
    }

    // Add to new owner's index if there is a new owner
    // This handles: new ownership, ownership change
    if (newOwner) {
      let currentIndices = this.ownershipIndex.get(newOwner);
      if (!currentIndices) {
        currentIndices = new Set<number>();
        this.ownershipIndex.set(newOwner, currentIndices);
      }
      currentIndices.add(landIndex);
    }

    // Schedule a batched update instead of updating immediately
    this.scheduleOwnershipUpdate();
  }

  public updateLand(entity: ParsedEntity<SchemaType>): void {
    const location = getLocationFromEntity(entity);

    // Enhanced logging with location and model details
    logEntityUpdate(entity, location, 'Land Update');
    if (location === undefined) return;

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
        console.log('Land deleted:', location);
        return { value: newLand };
      }

      // Handle empty land case
      if (
        EmptyLand.is(previousLand) &&
        landModel == undefined &&
        auctionModel == undefined
      ) {
        // If we only have a stake update for an empty land, store it as pending
        if (landStakeModel !== undefined) {
          this.pendingStake.set(pendingStakeKey, landStakeModel as LandStake);
        }

        this.currentLands.update((lands) => {
          lands[location.x][location.y] = previousLand;
          return lands;
        });
        return { value: previousLand };
      }

      // Handle auction case
      if (auctionModel !== undefined) {
        if (!auctionModel.is_finished) {
          let newLand: AuctionLand;

          if (AuctionLand.is(previousLand)) {
            previousLand.update(landModel as Land, auctionModel as Auction);
            newLand = previousLand;
          } else if (landModel !== undefined) {
            newLand = new AuctionLand(
              landModel as Land,
              auctionModel as Auction,
            );
          } else {
            newLand = new AuctionLand(previousLand, auctionModel as Auction);
            // Nuke the land
            gameSounds.play('nuke');
            const locationStr = coordinatesToLocation(location).toString();
            nukeStore.animationManager.triggerAnimation(locationStr, 1000);
          }

          this.currentLands.update((lands) => {
            lands[location.x][location.y] = newLand;
            return lands;
          });
          return { value: newLand };
        } else {
          // Handle case where auction is finished either the land is already building or still auction
          if (AuctionLand.is(previousLand)) {
            // Update existing auction land with finished auction data
            if (landModel !== undefined) {
              previousLand.update(landModel as Land, auctionModel as Auction);
            } else {
              // Only update auction properties when we don't have land data
              previousLand.updateAuction(auctionModel as Auction);
            }
            this.currentLands.update((lands) => {
              lands[location.x][location.y] = previousLand;
              return lands;
            });
            return { value: previousLand };
          } else if (BuildingLand.is(previousLand)) {
            // Land is already a building, don't create auction but update what we can
            // For finished auctions on building land, we typically don't need to do anything
            // as the land has already transitioned past the auction state
            return { value: previousLand };
          }
        }
      }

      let newLand = previousLand;

      // Handle land model updates
      if (landModel !== undefined) {
        if (AuctionLand.is(newLand) && Number(landModel.owner) == 0) {
          // Do not change the land, this is an empty update.
          const currentAuction = {
            start_price: newLand.startPrice.toBignumberish(),
            floor_price: newLand.floorPrice.toBignumberish(),
            is_finished: newLand.isFinished,
            land_location: newLand.locationString,
            start_time: newLand.startTime.getSeconds(),
          } as Auction;
          newLand.update(landModel as Land, currentAuction);
          return { value: newLand };
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
            (newLand as BuildingLand).updateStake(landStakeModel as LandStake);
          } else if (
            BuildingLand.is(previousLand) &&
            previousLand.stakeAmount
          ) {
            // If no new stake but previous land had stake, preserve it
            (newLand as BuildingLand).updateStake({
              location: landModel.location,
              amount: previousLand.stakeAmount.toBigint(),
            } as LandStake);
          }
        }
      } else if (landStakeModel !== undefined) {
        // We only have a stake update
        if (BuildingLand.is(newLand)) {
          // Apply stake to existing BuildingLand
          newLand.updateStake(landStakeModel as LandStake);
          newLand = BuildingLand.fromBuildingLand(newLand);
        } else {
          this.pendingStake.set(pendingStakeKey, landStakeModel as LandStake);
          // Return early, no land change needed
          return { value: previousLand };
        }
      }

      // Update claim store for BuildingLand
      if (BuildingLand.is(newLand)) {
        claimStore.value[newLand.locationString] = {
          animating: false,
          land: createLandWithActions(newLand, () => this.getAllLands()),
          claimable: true,
        };
      }

      // Update ownership index
      this.updateOwnershipIndex(location, previousLand, newLand);

      // Update the currentLands store
      this.currentLands.update((lands) => {
        lands[location.x][location.y] = newLand;
        return lands;
      });

      return { value: newLand };
    });
  }

  public updateLandDirectly(x: number, y: number, land: BaseLand): void {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return;

    // Get the old land for ownership index update
    const oldLandWrapped = this.store[x][y];
    let oldLand: BaseLand;
    const unsubscribe = oldLandWrapped.subscribe(
      ({ value }) => (oldLand = value),
    );
    unsubscribe();

    // Update ownership index
    this.updateOwnershipIndex({ x, y }, oldLand!, land);

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

  // Add default auction lands for tutorial mode
  public addTutorialAuctions(): void {
    console.log('Adding tutorial auction lands...');

    // Center position
    const centerX = Math.floor(GRID_SIZE / 2);
    const centerY = Math.floor(GRID_SIZE / 2);

    // First, add 5 player-owned lands grouped together in the center
    const playerLandPositions = [
      { x: centerX, y: centerY }, // Center
      { x: centerX + 1, y: centerY }, // Right
      { x: centerX - 1, y: centerY }, // Left
      { x: centerX, y: centerY + 1 }, // Below
      { x: centerX, y: centerY - 1 }, // Above
    ];

    const playerOwner =
      '0x0432d05c36cac355e0a74a08e8b8776b45f5bff96b59b351ec9171bf66a22a37';

    // Find specific token addresses
    const tokenAddressMap: { [symbol: string]: string } = {};
    data.availableTokens.forEach((token) => {
      tokenAddressMap[token.symbol] = token.address;
    });

    console.log('AddressMap: ', tokenAddressMap);

    // Define specific tokens for each building
    const buildingTokensAddresses = [
      tokenAddressMap['SOL']!, // Center - SOL
      tokenAddressMap['WBTC']!, // Right - BTC
      tokenAddressMap['ETH']!, // Left - ETH
      tokenAddressMap['DOG']!, // Below - DOGE
      tokenAddressMap['BONK']!, // Above - BONK
    ];

    console.log('Building Tokens Addresses: ', buildingTokensAddresses);

    const buildingTokens: Token[] = buildingTokensAddresses.map((address) => {
      return data.availableTokens.find(
        (token: Token) => token.address === address,
      ) as Token;
    });

    // Define specific configurations for each land
    const landConfigs = [
      {
        address: buildingTokensAddresses[0],
        price: CurrencyAmount.fromScaled(0.75, buildingTokens[0]),
        level: 'Second',
      }, // SOL - $400, Level 3
      {
        price: CurrencyAmount.fromScaled(0.001, buildingTokens[1]),
        level: 'Second',
      }, // BTC - $350, Level 3
      {
        price: CurrencyAmount.fromScaled(0.25, buildingTokens[2]),
        level: 'Second',
      }, // ETH - $250, Level 3
      {
        price: CurrencyAmount.fromScaled(10000, buildingTokens[3]),
        level: 'Second',
      }, // DOG - $150, Level 3
      {
        price: CurrencyAmount.fromScaled(15000, buildingTokens[4]),
        level: 'Second',
      }, // BONK - $100, Level 3
    ];

    this.currentLands.update((lands) => {
      // Add player-owned lands
      playerLandPositions.forEach(({ x, y }, index) => {
        // Use specific token for each position
        const tokenAddress = buildingTokensAddresses[index];
        const config = landConfigs[index];

        const playerLand: Land = {
          owner: playerOwner,
          location: coordinatesToLocation({ x, y }),
          block_date_bought: Date.now() / 1000,
          sell_price: config.price.toBigint(),
          token_used: tokenAddress,
          // @ts-ignore
          level: config.level,
        };

        const playerStake: LandStake = {
          location: coordinatesToLocation({ x, y }),
          amount: config.price.toBigint(),
          neighbors_info_packed: 0,
          accumulated_taxes_fee: 0,
        };

        const buildingLand = new BuildingLand(playerLand);
        buildingLand.updateStake(playerStake);

        // Update ownership index
        this.updateOwnershipIndexBulk({ x, y }, lands[x][y], buildingLand);

        this.store[x][y].set({ value: buildingLand });
        lands[x][y] = buildingLand;
      });

      // Force ownership update after bulk operation
      this.forceOwnershipUpdate();
      return lands;
    });

    // Now add auction lands in contact with the player lands
    const auctionPositions = [
      { x: centerX + 2, y: centerY }, // Right of right land
      { x: centerX - 2, y: centerY }, // Left of left land
      { x: centerX, y: centerY + 2 }, // Below bottom land
      { x: centerX, y: centerY - 2 }, // Above top land
      { x: centerX + 1, y: centerY + 1 }, // Diagonal SE
      { x: centerX - 1, y: centerY - 1 }, // Diagonal NW
    ];

    const auctionPrices = [
      10000000000000000000000, 10000000000000000000000, 10000000000000000000000,
      10000000000000000000000, 10000000000000000000000, 10000000000000000000,
    ];

    auctionPositions.forEach(({ x, y }, index) => {
      const location = coordinatesToLocation({ x, y });

      const fakeLand: Land = {
        owner: '0x00',
        location: location,
        block_date_bought: Date.now() / 1000,
        sell_price: auctionPrices[index],
        token_used: data.mainCurrencyAddress,
        //@ts-ignore
        level: 'First',
      };

      const fakeAuction: Auction = {
        land_location: location,
        is_finished: false,
        start_price: auctionPrices[index] * 2,
        start_time: Date.now() / 1000 - index * 60,
        floor_price: auctionPrices[index] * 0.5,
        sold_at_price: new CairoOption(CairoOptionVariant.None),
      };

      this.updateLand({
        entityId: `tutorial_auction_${location}`,
        models: {
          ponzi_land: {
            Land: fakeLand,
            Auction: fakeAuction,
          },
        },
      } as ParsedEntity<SchemaType>);
    });
  }

  // ================== Spectator Mode Methods ==================

  /**
   * Clear all lands to empty state (for spectator mode initialization)
   */
  public clearAllLands(): void {
    this.currentLands.update((lands) => {
      for (let x = 0; x < GRID_SIZE; x++) {
        for (let y = 0; y < GRID_SIZE; y++) {
          const emptyLand = new EmptyLand({ x, y });
          this.store[x][y].set({ value: emptyLand });
          lands[x][y] = emptyLand;
        }
      }
      return lands;
    });

    // Clear ownership index
    this.ownershipIndex.clear();
    this.ownershipIndexStore.set(new Map());

    // Clear pending stakes
    this.pendingStake.clear();
  }

  /**
   * Load a land from historical data (for spectator mode snapshot)
   */
  public loadSpectatorLand(historicalLand: LandHistoricalResponse): void {
    const { x, y } = locationToCoordinates(historicalLand.land_location);

    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return;

    // Create a BuildingLand from historical data
    const fakeLand: Land = {
      owner: historicalLand.owner,
      location: historicalLand.land_location,
      block_date_bought: new Date(historicalLand.time_bought).getTime() / 1000,
      sell_price: 1000000000000000000, // Placeholder since we don't have this data
      token_used: historicalLand.buy_token_used || data.mainCurrencyAddress,
      // @ts-ignore - level not in historical data, default to First
      level: 'First',
    };

    const fakeStake: LandStake = {
      location: historicalLand.land_location,
      amount: 1000000000000000000, // Placeholder
      neighbors_info_packed: 0,
      accumulated_taxes_fee: 0,
    };

    const buildingLand = new BuildingLand(fakeLand);
    buildingLand.updateStake(fakeStake);

    this.currentLands.update((lands) => {
      // Update ownership index
      this.updateOwnershipIndexBulk({ x, y }, lands[x][y], buildingLand);

      this.store[x][y].set({ value: buildingLand });
      lands[x][y] = buildingLand;
      return lands;
    });
  }

  /**
   * Apply a buy event from replay (for spectator mode)
   */
  public applySpectatorBuy(event: ReplayEvent): void {
    if (!event.position) return;

    const { x, y } = locationToCoordinates(event.location);
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return;

    const pos = event.position;

    // Create a BuildingLand from the event
    const fakeLand: Land = {
      owner: pos.owner,
      location: event.location,
      block_date_bought: new Date(pos.time_bought).getTime() / 1000,
      sell_price: 1000000000000000000, // Placeholder
      token_used: pos.buy_token_used || data.mainCurrencyAddress,
      // @ts-ignore
      level: 'First',
    };

    const fakeStake: LandStake = {
      location: event.location,
      amount: 1000000000000000000, // Placeholder
      neighbors_info_packed: 0,
      accumulated_taxes_fee: 0,
    };

    const buildingLand = new BuildingLand(fakeLand);
    buildingLand.updateStake(fakeStake);

    this.currentLands.update((lands) => {
      // Update ownership index
      this.updateOwnershipIndex({ x, y }, lands[x][y], buildingLand);

      this.store[x][y].set({ value: buildingLand });
      lands[x][y] = buildingLand;
      return lands;
    });
  }

  /**
   * Apply a nuke event from replay (for spectator mode)
   * Converts the land to an auction state
   */
  public applySpectatorNuke(event: ReplayEvent): void {
    const { x, y } = locationToCoordinates(event.location);
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return;

    // Create an auction land (land was nuked, goes to auction)
    const fakeAuction: Auction = {
      land_location: event.location,
      is_finished: false,
      start_price: 1000000000000000000,
      start_time: event.time.getTime() / 1000,
      floor_price: 100000000000000000,
      sold_at_price: new CairoOption(CairoOptionVariant.None),
    };

    const fakeLand: Land = {
      owner: '0x00',
      location: event.location,
      block_date_bought: event.time.getTime() / 1000,
      sell_price: 1000000000000000000,
      token_used: data.mainCurrencyAddress,
      // @ts-ignore
      level: 'First',
    };

    const auctionLand = new AuctionLand(fakeLand, fakeAuction);

    this.currentLands.update((lands) => {
      // Update ownership index (remove old owner)
      this.updateOwnershipIndex({ x, y }, lands[x][y], auctionLand);

      this.store[x][y].set({ value: auctionLand });
      lands[x][y] = auctionLand;
      return lands;
    });
  }

  /**
   * Force update ownership index store (call after bulk spectator operations)
   */
  public finalizeSpectatorLoad(): void {
    this.forceOwnershipUpdate();
  }
}
