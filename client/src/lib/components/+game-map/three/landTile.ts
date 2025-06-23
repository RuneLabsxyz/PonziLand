export class LandTile {
  position: [number, number, number];
  tokenName: string;
  level: number;

  constructor(
    position: [number, number, number],
    tokenName: string,
    level: number,
  ) {
    this.position = position;
    tokenName = tokenName || 'empty'; // Ensure tokenName is not null/undefined
    this.tokenName = tokenName;
    this.level = level;
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
