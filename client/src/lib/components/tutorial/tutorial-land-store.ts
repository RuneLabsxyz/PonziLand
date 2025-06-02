import { EmptyLand } from '$lib/api/land';
import { BuildingLand } from '$lib/api/land/building_land';
import { LandTileStore } from '$lib/api/land_tiles.svelte';
import { GRID_SIZE } from '$lib/const';
import type { Auction, Land, LandStake, SchemaType } from '$lib/models.gen';
import { cameraTransition } from '$lib/stores/camera.store';
import { nukeStore } from '$lib/stores/nuke.store.svelte';
import { coordinatesToLocation } from '$lib/utils';
import type { ParsedEntity } from '@dojoengine/sdk';
import { CairoOption, CairoOptionVariant } from 'starknet';
import { get } from 'svelte/store';

// Token addresses for tutorial
export const TOKEN_ADDRESSES = [
  '0x071de745c1ae996cfd39fb292b4342b7c086622e3ecf3a5692bd623060ff3fa0',
  '0x0335e87d03baaea788b8735ea0eac49406684081bb669535bb7074f9d3f66825',
  '0x04230d6e1203e0d26080eb1cf24d1a3708b8fc085a7e0a4b403f8cc4ec5f7b7b',
  '0x07031b4db035ffe8872034a97c60abd4e212528416f97462b1742e1f6cf82afe',
  '0x01d321fcdb8c0592760d566b32b707a822b5e516e87e54c85b135b0c030b1706',
];

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
}
