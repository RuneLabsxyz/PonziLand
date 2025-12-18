// Land without a factory
export interface BaseLand {
  id: number;
  position: { row: number; col: number };
  sellPrice: number;
  stakeAmount: number;
  initialStakeAmount: number;
}

// Factory that exists on a land
// Yellow paper: Factories track creation time for burn/inflation calculations
export interface Factory {
  createdAt: number; // Simulation time when factory was created (seconds)
  stakedGard: number; // Initial locked amount
  score: number; // EGS game score (0-100)
  burnReductions: number; // Sum of beta * Ticket from failed challenges
  inflationPaidOut: number; // Sum of payouts to winning challengers
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
  ticketCost: number;
  gardChange: number; // Positive if won, negative if lost
}

// Chart data point for visualizing factory economics
export interface ChartDataPoint {
  time: number; // Simulation time in seconds
  burn: number; // B(t)
  inflation: number; // I(t)
  netSupply: number; // I(t) - B(t)
  effectiveBurn: number; // Beff (after challenge reductions)
  availableInflation: number; // I(t) - paid out
  effectiveNet: number; // availableInflation - effectiveBurn
}
