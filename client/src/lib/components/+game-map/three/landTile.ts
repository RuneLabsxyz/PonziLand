import type { BaseLand } from '$lib/api/land';

export class LandTile {
  position: [number, number, number];
  tokenName: string;
  level: number;
  land: BaseLand;

  constructor(
    position: [number, number, number],
    tokenName: string,
    level: number,
    land: BaseLand, // Default to null if not provided
  ) {
    this.position = position;
    tokenName = tokenName || 'empty'; // Ensure tokenName is not null/undefined
    this.tokenName = tokenName;
    this.level = level;
    this.land = land;
  }

  // Derive building animation name from token name and level
  getBuildingAnimationName(): string {
    return `${this.tokenName}_${this.level}`;
  }

  // Derive biome animation name from token name
  getBiomeAnimationName(): string {
    return this.tokenName;
  }
}
