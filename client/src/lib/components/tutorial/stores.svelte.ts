import { toHexWithPadding } from '$lib/utils';
import data from '$profileData';

export const MAP_SIZE = 16;

interface BaseTile {
  location: string;
  timeToNuke: number;
  owner?: string;
}

interface GrassTile extends BaseTile {
  type: 'grass';
}

interface AuctionTile extends BaseTile {
  type: 'auction';
}

interface HouseTile extends BaseTile {
  type: 'house';
  level: 1 | 2 | 3;
  token: (typeof data.availableTokens)[number];
}

// Union type for all possible tiles
export type Tile = GrassTile | AuctionTile | HouseTile;

function createFakeTiles(): Tile[][] {
  return Array(MAP_SIZE)
    .fill(null)
    .map((_, i) =>
      Array(MAP_SIZE)
        .fill(null)
        .map((_, j) => ({
          location: toHexWithPadding(i * MAP_SIZE + j),
          type: 'grass',
          timeToNuke: 10000000,
        })),
    );
}

class TileState {
  public tilesStore: Tile[][] = $state(createFakeTiles());
  public nuke = $state(false);
  public displayRates = $state(false);

  getDisplayRates() {
    return this.displayRates;
  }

  setDisplayRates(displayRates: boolean) {
    this.displayRates = displayRates;
  }
  getTiles() {
    return this.tilesStore;
  }

  getNuke() {
    return this.nuke;
  }

  setNuke(nuke: boolean) {
    this.nuke = nuke;
  }

  addAuction(x: number = 8, y: number = 8): void {
    if (this.tilesStore[x] && this.tilesStore[x][y]) {
      this.tilesStore[x][y] = {
        ...this.tilesStore[x][y],
        type: 'auction',
        owner: '0x',
      };
    }
  }

  removeAuction(x: number = 8, y: number = 8): void {
    if (this.tilesStore[x] && this.tilesStore[x][y]) {
      this.tilesStore[x][y] = {
        ...this.tilesStore[x][y],
        type: 'grass',
      };
    }
  }

  buyAuction(x: number = 8, y: number = 8, tokenId: number = 0): void {
    if (this.tilesStore[x] && this.tilesStore[x][y]) {
      this.tilesStore[x][y] = {
        ...this.tilesStore[x][y],
        type: 'house',
        level: 1 as 1 | 2 | 3,
        token: data.availableTokens[tokenId],
      };
    }
  }

  reduceTimeToNuke(x: number, y: number): void {
    if (this.tilesStore[x] && this.tilesStore[x][y]) {
      this.tilesStore[x][y].timeToNuke = this.tilesStore[x][y].timeToNuke / 2;
    }
  }

  getNukeTime(x: number, y: number): number {
    if (this.tilesStore[x] && this.tilesStore[x][y]) {
      return this.tilesStore[x][y].timeToNuke;
    }
    return 0;
  }

  levelUp(x: number, y: number): void {
    if (
      this.tilesStore[x] &&
      this.tilesStore[x][y] &&
      this.tilesStore[x][y].type === 'house' &&
      'level' in this.tilesStore[x][y]
    ) {
      this.tilesStore[x][y] = {
        ...this.tilesStore[x][y],
        level: (Number(this.tilesStore[x][y].level) + 1) as 1 | 2 | 3,
      };
    }
  }
}

export const tileState = new TileState();

export function tutorialProgression() {
  let value = $state(1);

  return {
    get value() {
      return value;
    },
    increment: () => (value += 1),
    decrement: () => (value -= 1),
  };
}
