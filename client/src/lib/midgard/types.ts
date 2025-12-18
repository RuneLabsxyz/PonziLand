// Land without a factory
export interface BaseLand {
  id: number;
  position: { row: number; col: number };
  sellPrice: number;
  stakeAmount: number;
  initialStakeAmount: number;
}

// Factory that exists on a land
export interface Factory {
  lockedGard: number;
  initialLockedGard: number;
  mintedSupply: number;
  burntAmount: number;
  score: number; // 0-100
}

// Land with a factory
export interface LandWithFactory extends BaseLand {
  factory: Factory;
}

// Union type for any land
export type Land = BaseLand | LandWithFactory;

// Type guard to check if land has a factory
export function hasFactory(land: Land): land is LandWithFactory {
  return 'factory' in land && land.factory !== null;
}

// Challenge result
export interface ChallengeResult {
  playerScore: number;
  factoryScore: number;
  won: boolean;
  gardChange: number; // Positive if won, negative if lost
}
