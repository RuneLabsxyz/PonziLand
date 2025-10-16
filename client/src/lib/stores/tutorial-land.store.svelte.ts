import type { BigNumberish } from 'starknet';

export interface TutorialLand {
  location: number; // Encoded location (y * 256 + x)
  x: number;
  y: number;
  owner: string | null;
  sellPrice: number;
  tokenUsed: string;
  level: number; // 1-3
  blockDateBought: number;
  type: 'empty' | 'building' | 'auction';
  isHighlighted?: boolean; // For tutorial highlighting
}

export class TutorialLandStore {
  // Grid size matching the real game
  GRID_SIZE = 256;

  // All lands in the tutorial (sparse grid)
  lands = $state<Map<number, TutorialLand>>(new Map());

  // Selected land
  selectedLand = $state<TutorialLand | null>(null);

  // Auction state
  currentAuction = $state<{
    landLocation: number;
    currentBid: number;
    highestBidder: string;
    endTime: number;
  } | null>(null);

  constructor() {
    this.initializeTutorialLands();
  }

  // Initialize tutorial lands with a predefined layout
  private initializeTutorialLands() {
    // Create a small tutorial area with various land types
    const tutorialLands: TutorialLand[] = [
      // Empty lands for purchase
      this.createLand(128, 128, { type: 'empty', sellPrice: 100 }),
      this.createLand(129, 128, { type: 'empty', sellPrice: 150 }),
      this.createLand(127, 128, { type: 'empty', sellPrice: 120 }),

      // Player's starting land
      this.createLand(128, 127, {
        type: 'building',
        owner: '0x1234567890abcdef1234567890abcdef12345678',
        level: 1,
        tokenUsed: 'LORDS',
        sellPrice: 200,
      }),

      // Other players' lands
      this.createLand(130, 128, {
        type: 'building',
        owner: '0xabcdef1234567890abcdef1234567890abcdef12',
        level: 2,
        tokenUsed: 'ETH',
        sellPrice: 500,
      }),

      this.createLand(128, 129, {
        type: 'building',
        owner: '0x9876543210fedcba9876543210fedcba98765432',
        level: 3,
        tokenUsed: 'LORDS',
        sellPrice: 1000,
      }),

      // Auction land
      this.createLand(126, 128, {
        type: 'auction',
        sellPrice: 300,
      }),
    ];

    // Add lands to the map
    tutorialLands.forEach((land) => {
      this.lands.set(land.location, land);
    });

    // Set up auction
    this.currentAuction = {
      landLocation: this.coordinatesToLocation(126, 128),
      currentBid: 300,
      highestBidder: '0xdeadbeef',
      endTime: Date.now() + 5 * 60 * 1000, // 5 minutes from now
    };
  }

  // Create a land object
  private createLand(
    x: number,
    y: number,
    options: Partial<TutorialLand>,
  ): TutorialLand {
    const location = this.coordinatesToLocation(x, y);
    return {
      location,
      x,
      y,
      owner: null,
      sellPrice: 100,
      tokenUsed: 'LORDS',
      level: 1,
      blockDateBought: Date.now(),
      type: 'empty',
      isHighlighted: false,
      ...options,
    };
  }

  // Convert coordinates to location
  coordinatesToLocation(x: number, y: number): number {
    return y * this.GRID_SIZE + x;
  }

  // Convert location to coordinates
  locationToCoordinates(location: number): { x: number; y: number } {
    return {
      x: location % this.GRID_SIZE,
      y: Math.floor(location / this.GRID_SIZE),
    };
  }

  // Get land by coordinates
  getLand(x: number, y: number): TutorialLand | undefined {
    const location = this.coordinatesToLocation(x, y);
    return this.lands.get(location);
  }

  // Get land by location
  getLandByLocation(location: number): TutorialLand | undefined {
    return this.lands.get(location);
  }

  // Buy land
  buyLand(
    x: number,
    y: number,
    buyer: string,
    token: string,
    price: number,
  ): boolean {
    const land = this.getLand(x, y);
    if (!land || land.type !== 'empty') return false;

    // Update land
    const updatedLand: TutorialLand = {
      ...land,
      type: 'building',
      owner: buyer,
      tokenUsed: token,
      sellPrice: Math.floor(price * 1.1), // 10% markup
      blockDateBought: Date.now(),
    };

    this.lands.set(land.location, updatedLand);
    return true;
  }

  // Sell land
  sellLand(
    x: number,
    y: number,
    newOwner: string,
    token: string,
    price: number,
  ): boolean {
    const land = this.getLand(x, y);
    if (!land || land.type !== 'building') return false;

    // Update land
    const updatedLand: TutorialLand = {
      ...land,
      owner: newOwner,
      tokenUsed: token,
      sellPrice: Math.floor(price * 1.1), // 10% markup
      blockDateBought: Date.now(),
    };

    this.lands.set(land.location, updatedLand);
    return true;
  }

  // Upgrade land
  upgradeLand(x: number, y: number): boolean {
    const land = this.getLand(x, y);
    if (!land || land.type !== 'building' || land.level >= 3) return false;

    const updatedLand: TutorialLand = {
      ...land,
      level: land.level + 1,
    };

    this.lands.set(land.location, updatedLand);
    return true;
  }

  // Highlight land (for tutorial)
  highlightLand(x: number, y: number, highlight: boolean = true): void {
    const land = this.getLand(x, y);
    if (!land) return;

    const updatedLand: TutorialLand = {
      ...land,
      isHighlighted: highlight,
    };

    this.lands.set(land.location, updatedLand);
  }

  // Select land
  selectLand(x: number, y: number): void {
    this.selectedLand = this.getLand(x, y) || null;
  }

  // Get all lands as array
  getAllLands(): TutorialLand[] {
    return Array.from(this.lands.values());
  }

  // Get lands in a region
  getLandsInRegion(
    centerX: number,
    centerY: number,
    radius: number,
  ): TutorialLand[] {
    const lands: TutorialLand[] = [];

    for (let x = centerX - radius; x <= centerX + radius; x++) {
      for (let y = centerY - radius; y <= centerY + radius; y++) {
        const land = this.getLand(x, y);
        if (land) lands.push(land);
      }
    }

    return lands;
  }

  // Reset to initial state
  reset(): void {
    this.lands.clear();
    this.selectedLand = null;
    this.currentAuction = null;
    this.initializeTutorialLands();
  }
}

export const tutorialLandStore = new TutorialLandStore();
