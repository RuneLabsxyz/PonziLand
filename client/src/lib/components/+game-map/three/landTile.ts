import type { BaseLand } from '$lib/api/land';
import { getTokenMetadata } from '$lib/tokens';
import { selectEmptyBiomeAnimation } from './utils/biome-animation-selector';

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

    // For empty biomes, select a random variation based on location
    if (this.skin === 'empty' || this.skin === 'default') {
      const landX = Math.floor(position[0]);
      const landZ = Math.floor(position[2]);
      this._biomeAnimationName = selectEmptyBiomeAnimation(landX, landZ);
    } else {
      this._biomeAnimationName = this.skin;
    }
  }

  // Memoized getter for building animation name
  get buildingAnimationName(): string {
    return this._buildingAnimationName;
  }

  // Memoized getter for biome animation name
  get biomeAnimationName(): string {
    return this._biomeAnimationName;
  }

  // Get bottom padding for building animation in pixels, converted to world units
  get buildingBottomPadding(): number {
    if (this.skin === 'empty' || this.skin === 'default') {
      return 0;
    }

    const tokenMetadata = getTokenMetadata(this.skin);
    if (!tokenMetadata) {
      return 0;
    }

    const building =
      tokenMetadata.building[this.level as keyof typeof tokenMetadata.building];
    if (!building?.useAnimation || !building.animations) {
      return 0;
    }

    // Get the first animation's bottom padding (assuming all animations for a level have the same padding)
    const bottomPaddingPixels = building.animations[0]?.bottomPadding ?? 0;

    // Convert pixels to world units (adjust this conversion factor as needed)
    // Assuming 1 world unit = 64 pixels (common in sprite-based games)
    const pixelsPerWorldUnit = 64;
    return bottomPaddingPixels / pixelsPerWorldUnit;
  }

  // Get scale factor for building animation (defaults to 1)
  get buildingScale(): number {
    if (this.skin === 'empty' || this.skin === 'default') {
      return 1;
    }

    const tokenMetadata = getTokenMetadata(this.skin);
    if (!tokenMetadata) {
      return 1;
    }

    const building =
      tokenMetadata.building[this.level as keyof typeof tokenMetadata.building];
    if (!building?.useAnimation || !building.animations) {
      return 1;
    }

    // Get the first animation's scale (assuming all animations for a level have the same scale)
    return building.animations[0]?.scale ?? 1;
  }
}
