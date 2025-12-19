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
  challengeWins: number; // Number of challenges won by challengers
  challengeLosses: number; // Number of challenges lost by challengers
  challengeLossValue: number; // Sum of ticket costs from lost challenges
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

// Challenge record for history table
export interface ChallengeRecord {
  time: number; // Simulation time when challenge occurred
  ticketCost: number; // Ticket price paid
  potentialReward: number; // gamma * ticket (what you could have won)
  playerScore: number;
  factoryScore: number;
  won: boolean;
  netResult: number; // gardChange: positive if won, negative (ticket cost) if lost
}

// Closed factory record for history table
export interface ClosedFactoryRecord {
  landId: number;
  closedAt: number; // Simulation time when closed
  duration: number; // How long it ran (closedAt - createdAt)
  stakedGard: number; // Initial stake
  finalBurn: number; // Final effective burn (>= stake)
  finalInflation: number; // Final available inflation
  score: number; // Factory score
  totalChallenges: number; // Total challenges received
  wins: number; // Challenges won by challengers
  losses: number; // Challenges lost by challengers
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
