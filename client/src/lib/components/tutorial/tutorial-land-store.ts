import { EmptyLand, type LandWithActions } from '$lib/api/land';
import { BuildingLand } from '$lib/api/land/building_land';
import { LandTileStore } from '$lib/api/land_tiles.svelte';
import { Neighbors } from '$lib/api/neighbors';
import { config } from '$lib/stores/config.store.svelte';
import type { Token } from '$lib/interfaces';
import type { Auction, Land, LandStake, SchemaType } from '$lib/models.gen';
import { cameraTransition } from '$lib/stores/camera.store';
import { nukeStore } from '$lib/stores/nuke.store.svelte';
import {
  coordinatesToLocation,
  padAddress,
  toBigInt,
  toHexWithPadding,
} from '$lib/utils';
import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
import { createLandWithActions } from '$lib/utils/land-actions';
import { burnForOneNeighbor } from '$lib/utils/taxes';
import data from '$profileData';
import type { ParsedEntity } from '@dojoengine/sdk';
import { CairoOption, CairoOptionVariant } from 'starknet';
import { get } from 'svelte/store';

// Token addresses for tutorial
export const TOKEN_ADDRESSES = data.availableTokens.map(
  (token) => token.address,
);

// Default values for tutorial
export const DEFAULT_SELL_PRICE = 1000000000000000000;
export const DEFAULT_STAKE_AMOUNT = 1280000 * 10 ** 18;
export const DEFAULT_OWNER =
  '0x05144466224fde5d648d6295a2fb6e7cd45f2ca3ede06196728026f12c84c9ff';

export class TutorialLandStore extends LandTileStore {
  private _displayRates = false;

  constructor() {
    super();
  }

  getDisplayRates() {
    return this._displayRates;
  }

  setDisplayRates(displayRates: boolean) {
    this._displayRates = displayRates;
  }

  // Tutorial-specific methods
  addAuction(x: number = 32, y: number = 32): void {
    const location = x + y * GRID_SIZE;
    const fakeLand: Land = {
      owner: '0x00',
      location,
      block_date_bought: Date.now(),
      sell_price: DEFAULT_SELL_PRICE,
      token_used: TOKEN_ADDRESSES[0],
      //@ts-ignore
      level: 'First',
    };

    const fakeAuction: Auction = {
      land_location: location,
      is_finished: false,
      start_price: DEFAULT_SELL_PRICE * 2,
      start_time: Date.now(),
      floor_price: DEFAULT_SELL_PRICE,
      decay_rate: 0,
      sold_at_price: new CairoOption(CairoOptionVariant.None),
    };

    console.log('Adding auction', location);
    this.updateLand({
      entityId: `land_${location}`,
      models: {
        ponzi_land: {
          Land: fakeLand,
          Auction: fakeAuction,
        },
      },
    } as ParsedEntity<SchemaType>);
  }

  removeAuction(x: number = 32, y: number = 32): void {
    this.updateLandDirectly(x, y, new EmptyLand({ x, y }));
  }

  buyAuction(x: number = 32, y: number = 32, tokenId: number = 0): void {
    const location = x + y * GRID_SIZE;
    const fakeLand: Land = {
      owner: DEFAULT_OWNER,
      location,
      block_date_bought: Date.now(),
      sell_price: DEFAULT_SELL_PRICE,
      token_used: TOKEN_ADDRESSES[tokenId],
      //@ts-ignore
      level: 'Zero',
    };

    const fakeStake: LandStake = {
      location,
      amount: DEFAULT_STAKE_AMOUNT,
      last_pay_time: Date.now(),
    };

    const buildingLand = new BuildingLand(fakeLand);
    buildingLand.updateStake(fakeStake);
    this.updateLandDirectly(x, y, buildingLand);
  }

  levelUp(x: number, y: number): void {
    const landStore = this.getLand(x, y);
    if (!landStore) return;

    const currentLand = get(landStore);
    if (!currentLand || currentLand.type !== 'building') return;

    const levels = ['Zero', 'First', 'Second'];
    const currentLevel = currentLand.level;
    const nextLevelIndex = currentLevel;
    if (nextLevelIndex >= levels.length) return;

    const location = coordinatesToLocation(currentLand.location);
    const fakeLand: Land = {
      owner: currentLand.owner,
      location,
      block_date_bought: currentLand.block_date_bought,
      sell_price: currentLand.sell_price,
      token_used: currentLand.token_used,
      level: levels[nextLevelIndex] as any,
    };

    const buildingLand = new BuildingLand(fakeLand);
    buildingLand.updateStake({
      location,
      amount: DEFAULT_STAKE_AMOUNT,
      last_pay_time: currentLand.lastPayTime.getTime(),
    });
    console.log('stake amount', currentLand.stakeAmount.rawValue().toNumber());
    this.updateLandDirectly(x, y, buildingLand);
  }

  reduceTimeToNuke(x: number, y: number): void {
    const landStore = this.getLand(x, y);
    if (!landStore) return;

    const currentLand = get(landStore);
    if (!currentLand || currentLand.type !== 'building') return;

    const location = coordinatesToLocation(currentLand.location);

    if (BuildingLand.is(currentLand)) {
      currentLand.updateStake({
        location,
        amount: currentLand.stakeAmount.toBigint() / 2n,
        last_pay_time: Date.now(),
      });
    }
    console.log('stake amount', currentLand.stakeAmount.rawValue().toNumber());

    this.updateLandDirectly(x, y, currentLand);
  }

  getNukeTime(x: number, y: number): number {
    const landStore = this.getLand(x, y);
    if (!landStore) return 0;

    const currentLand = get(landStore);
    if (!currentLand || currentLand.type !== 'building') return 0;

    return BuildingLand.is(currentLand)
      ? currentLand.stakeAmount.rawValue().toNumber()
      : 0;
  }

  setNuke(nuke: boolean): void {
    if (nuke) {
      const location = 32 + 32 * GRID_SIZE;
      nukeStore.nuking[location] = true;
      setTimeout(() => {
        nukeStore.nuking[location] = false;
        this.removeAuction(32, 32);
      }, 3500);
    }
  }

  moveCameraToLocation(location: number, scale: number = 3) {
    const x = location % GRID_SIZE;
    const y = Math.floor(location / GRID_SIZE);

    // Calculate the center position of the tile
    const tileCenterX = x * 32; // TILE_SIZE is 32
    const tileCenterY = y * 32;

    // Calculate the offset to center the tile in the viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const offsetX = viewportWidth / 2 - tileCenterX * scale;
    const offsetY = viewportHeight / 2 - tileCenterY * scale;

    // Update camera position
    cameraTransition.set(
      {
        scale,
        offsetX,
        offsetY,
      },
      { duration: 0 },
    );
  }

  // Add this method to the TutorialLandStore class
  getNeighborsYield(landLocation: string): Array<{
    token: Token | undefined;
    sell_price: bigint;
    percent_rate: bigint;
    location: bigint;
    per_hour: bigint;
  } | null> {
    const neighbors = this.getLandNeighbors(landLocation); // Implement this method to get neighbors
    const yieldInfo: Array<{
      token: Token | undefined;
      sell_price: bigint;
      percent_rate: bigint;
      location: bigint;
      per_hour: bigint;
    } | null> = [];

    console.log('Neighbors:', neighbors);

    for (const neighbor of neighbors) {
      if (neighbor === null) {
        yieldInfo.push(null);
        continue;
      }
      const landStake = neighbor.stakeAmount;
      if (landStake.rawValue().isGreaterThan(0)) {
        const token = data.availableTokens.find(
          (token) =>
            padAddress(token.address) === padAddress(neighbor.token_used),
        );
        const rate = (config.TAX_RATE * config.GAME_SPEED) / 8; // Adjust this based on your logic
        const ratePerHour = this.getTaxRatePerNeighbor(neighbor); // Implement this method to calculate tax rate per neighbor

        yieldInfo.push({
          token,
          sell_price: BigInt(neighbor.sell_price),
          percent_rate: BigInt(rate * 100),
          per_hour: CurrencyAmount.fromScaled(
            ratePerHour.toNumber(),
            token,
          ).toBigint(),
          location: toBigInt(neighbor.location) ?? 0n,
        });
      }
    }
    console.log('Yield info for neighbors:', yieldInfo);
    return yieldInfo;
  }

  // Implement the method to get neighbors
  getLandNeighbors(landLocation: string): Array<LandWithActions | null> {
    const allLands = this.getAllLands();
    const neighbors = new Neighbors({
      location: landLocation,
      source: get(allLands),
    });

    const filledArray = neighbors.locations.array.map((loc) => {
      return neighbors
        .getNeighbors()
        .find((l) => l.locationString === toHexWithPadding(loc));
    });

    const arrayWithUndefined = [
      ...filledArray.slice(0, 4), // Elements 0-4
      undefined, // Insert undefined after position 4
      ...filledArray.slice(4), // Rest of the elements
    ];

    const neiborsWithActions = arrayWithUndefined.map((land) => {
      if (!land) {
        return null;
      }
      if (BuildingLand.is(land)) {
        return createLandWithActions(land, this.getAllLands);
      } else {
        return null;
      }
    });

    return neiborsWithActions;
  }

  // Implement the method to calculate tax rate per neighbor
  getTaxRatePerNeighbor(neighbor: LandWithActions) {
    return burnForOneNeighbor(neighbor);
  }

  setStake(amount: number = 100, x: number = 32, y: number = 32): void {
    const landStore = this.getLand(x, y);
    if (!landStore) return;

    const currentLand = get(landStore);
    if (!currentLand || !BuildingLand.is(currentLand)) return;

    const location = coordinatesToLocation(currentLand.location);

    if (BuildingLand.is(currentLand)) {
      currentLand.updateStake({
        location,
        amount: amount,
        last_pay_time: Date.now(),
      });
    }
    console.log('stake amount', currentLand.stakeAmount.rawValue().toNumber());

    this.updateLandDirectly(x, y, BuildingLand.fromBuildingLand(currentLand));
  }

  getEstimatedNukeTime(land: LandWithActions) {
    // This function estimates the time until a nuke can be used based on the stake amount

    // Get number of neighbors
    const neighbors = this.getNeighborsYield(land.location);
    const neighborCount = neighbors.filter(
      (n) => n !== null && n.token !== undefined,
    ).length;

    const burnForOneNeighbor = this.getTaxRatePerNeighbor(land);

    // Calculate the estimated time based on the stake amount and neighbor count
    const stakeAmount = land.stakeAmount.rawValue().toNumber();
    const estimatedTime =
      stakeAmount / (burnForOneNeighbor.toNumber() * neighborCount);

    return estimatedTime;
  }
}
