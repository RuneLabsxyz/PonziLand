import type { BaseLand } from '$lib/api/land';

export class LandTile {
  position: [number, number, number];
  tokenName: string;
  skin: string;
  level: number;
  land: BaseLand;
  private _buildingAnimationName: string;
  private _biomeAnimationName: string;

  constructor(
    position: [number, number, number],
    tokenName: string,
    skin: string,
    level: number,
    land: BaseLand, // Default to null if not provided
  ) {
    this.position = position;
    tokenName = tokenName || 'empty'; // Ensure tokenName is not null/undefined
    this.tokenName = tokenName;
    skin = skin || 'empty'; // Ensure skin is not null/undefined
    this.skin = skin;
    this.level = level;
    this.land = land;
    // Memoize animation names
    this._buildingAnimationName = `${this.skin}_${this.level}`;
    this._biomeAnimationName = this.skin;
  }

  // Memoized getter for building animation name
  get buildingAnimationName(): string {
    return this._buildingAnimationName;
  }

  // Memoized getter for biome animation name
  get biomeAnimationName(): string {
    return this._biomeAnimationName;
  }
}
