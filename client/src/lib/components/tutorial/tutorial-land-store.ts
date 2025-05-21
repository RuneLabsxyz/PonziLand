import { BaseLand, EmptyLand } from '$lib/api/land';
import { AuctionLand } from '$lib/api/land/auction_land';
import { BuildingLand } from '$lib/api/land/building_land';
import { LandTileStore } from '$lib/api/land_tiles.svelte';
import { GRID_SIZE } from '$lib/const';
import type { Auction, Land, LandStake } from '$lib/models.gen';
import { cameraTransition } from '$lib/stores/camera.store';
import { nukeStore } from '$lib/stores/nuke.store.svelte';
import { coordinatesToLocation } from '$lib/utils';
import { CairoOption, CairoOptionVariant } from 'starknet';
import { get } from 'svelte/store';

// Token addresses for tutorial
export const TOKEN_ADDRESSES = [
  '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7', // ETH
  '0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8', // USDC
  '0x00da114221cb83fa859dbdb4c44beeaa0bb37c7537ad5ae66fe5e0efd20e6eb3', // USDT
];

// Default values for tutorial
export const DEFAULT_SELL_PRICE = 1000;
export const DEFAULT_STAKE_AMOUNT = 1000;
export const DEFAULT_OWNER =
  '0x05144466224fde5d648d6295a2fb6e7cd45f2ca3ede06196728026f12c84c9ff';

export class TutorialLandStore extends LandTileStore {
  public displayRates = $state(false);

  constructor() {
    super();
  }

  getDisplayRates() {
    return this.displayRates;
  }

  setDisplayRates(displayRates: boolean) {
    this.displayRates = displayRates;
  }

  protected setLand(x: number, y: number, land: BaseLand) {
    // @ts-ignore: currentLands is private in base, but we need to update for tutorial
    this.currentLands.update((lands) => {
      lands[x][y] = land;
      return lands;
    });
  }

  // Tutorial-specific methods
  addAuction(x: number = 8, y: number = 8): void {
    const location = x + y * GRID_SIZE;
    const fakeLand: Land = {
      owner: '0x',
      location,
      block_date_bought: Date.now(),
      sell_price: DEFAULT_SELL_PRICE,
      token_used: TOKEN_ADDRESSES[0],
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

    const auctionLand = new AuctionLand(fakeLand, fakeAuction);
    this.setLand(x, y, auctionLand);
  }

  removeAuction(x: number = 8, y: number = 8): void {
    this.setLand(x, y, new EmptyLand({ x, y }));
  }

  buyAuction(x: number = 8, y: number = 8, tokenId: number = 0): void {
    const location = x + y * GRID_SIZE;
    const fakeLand: Land = {
      owner: DEFAULT_OWNER,
      location,
      block_date_bought: Date.now(),
      sell_price: DEFAULT_SELL_PRICE,
      token_used: TOKEN_ADDRESSES[tokenId],
      level: 'First',
    };

    const fakeStake: LandStake = {
      location,
      amount: DEFAULT_STAKE_AMOUNT,
      last_pay_time: Date.now(),
    };

    const buildingLand = new BuildingLand(fakeLand);
    buildingLand.updateStake(fakeStake);
    this.setLand(x, y, buildingLand);
  }

  levelUp(x: number, y: number): void {
    const landStore = this.getLand(x, y);
    if (!landStore) return;

    const currentLand = get(landStore);
    if (!currentLand || currentLand.type !== 'building') return;

    const levels = ['First', 'Second', 'Third'];
    const currentLevel = currentLand.level;
    const nextLevelIndex = levels.indexOf(currentLevel) + 1;
    if (nextLevelIndex >= levels.length) return;

    const fakeLand: Land = {
      owner: currentLand.owner,
      location: coordinatesToLocation(currentLand.location),
      block_date_bought: currentLand.block_date_bought,
      sell_price: currentLand.sell_price,
      token_used: currentLand.token_used,
      level: levels[nextLevelIndex] as any,
    };

    const buildingLand = new BuildingLand(fakeLand);
    if (BuildingLand.is(currentLand)) {
      buildingLand.updateStake({
        location: coordinatesToLocation(currentLand.location),
        amount: currentLand.stakeAmount.rawValue().toString(),
        last_pay_time: currentLand.lastPayTime.getTime(),
      });
    }
    this.setLand(x, y, buildingLand);
  }

  reduceTimeToNuke(x: number, y: number): void {
    const landStore = this.getLand(x, y);
    if (!landStore) return;

    const currentLand = get(landStore);
    if (!currentLand || currentLand.type !== 'building') return;

    const fakeStake: LandStake = {
      location: coordinatesToLocation(currentLand.location),
      amount: BuildingLand.is(currentLand)
        ? currentLand.stakeAmount.rawValue().div(2).toString()
        : DEFAULT_STAKE_AMOUNT / 2,
      last_pay_time: Date.now(),
    };

    if (BuildingLand.is(currentLand)) {
      const buildingLand = new BuildingLand({
        owner: currentLand.owner,
        location: coordinatesToLocation(currentLand.location),
        block_date_bought: currentLand.block_date_bought,
        sell_price: currentLand.sell_price,
        token_used: currentLand.token_used,
        level: currentLand.level,
      });
      buildingLand.updateStake(fakeStake);
      this.setLand(x, y, buildingLand);
    }
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
      const location = 8 + 8 * GRID_SIZE;
      nukeStore.nuking[location] = true;
      setTimeout(() => {
        nukeStore.nuking[location] = false;
        this.removeAuction(8, 8);
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
}
