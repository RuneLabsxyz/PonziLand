import type { BaseLand } from './types';

// Grid configuration
export const GRID_SIZE = 3; // 3x3

// Initial player balances (tokenomics)
export const INITIAL_TYCOON_BALANCE = 1000; // Factory owner
export const INITIAL_CHALLENGER_BALANCE = 1000; // Challenger

// Time settings
// POC uses accelerated time: 1 real second = configurable game time
export const TICK_INTERVAL_MS = 100; // Update every 100ms for smooth UI
export const BASE_TIME_PER_REAL_SECOND = 3600; // 1 real second = 1 hour game time (simulation)
export const API_GAME_SPEED = 60; // API mode: 1 real second = 1 game minute

// Yellow Paper: Factory Burn/Inflation Rates
// r: burn rate (GARD per game second)
export const BURN_RATE = 0.001;
// A: inflation ramp cap duration (7 days = 604800 seconds)
export const INFLATION_RAMP_DURATION = 604800;
// m: maximum bonus fraction (50% max inflation bonus)
export const MAX_BONUS_FRACTION = 5;

// Yellow Paper: Challenge Parameters
// alpha: challenge cost as fraction of effective burn (10%)
export const CHALLENGE_COST_FRACTION = 0.1;
// beta: fraction of lost ticket that reduces burn obligation (90%)
export const LOSS_BURN_REDUCTION = 0.9;
// gamma: win payout multiplier (190% of ticket)
export const WIN_PAYOUT_MULTIPLIER = 1.9;

// PonziLand Tax Parameters (matching taxes.ts formulas)
export const TAX_RATE = 0.1; // 10% tax rate
export const PONZI_GAME_SPEED = 20; // Normal speed multiplier
export const MAX_NEIGHBORS = 8; // Max possible neighbors in grid
export const BASE_TIME = 3600; // 1 hour in seconds (base unit for tax calc)

// Time speed presets for UI
export const TIME_SPEEDS: number[] = [1, 2, 5, 10];

// Initial lands configuration
export const INITIAL_LANDS: BaseLand[] = [
  {
    id: 0,
    position: { row: 0, col: 0 },
    sellPrice: 50,
    stakeAmount: 100,
    initialStakeAmount: 100,
  },
  {
    id: 1,
    position: { row: 0, col: 1 },
    sellPrice: 60,
    stakeAmount: 120,
    initialStakeAmount: 120,
  },
  {
    id: 2,
    position: { row: 0, col: 2 },
    sellPrice: 55,
    stakeAmount: 110,
    initialStakeAmount: 110,
  },
  {
    id: 3,
    position: { row: 1, col: 0 },
    sellPrice: 70,
    stakeAmount: 140,
    initialStakeAmount: 140,
  },
  {
    id: 4,
    position: { row: 1, col: 1 },
    sellPrice: 100,
    stakeAmount: 200,
    initialStakeAmount: 200,
  }, // Center premium
  {
    id: 5,
    position: { row: 1, col: 2 },
    sellPrice: 65,
    stakeAmount: 130,
    initialStakeAmount: 130,
  },
  {
    id: 6,
    position: { row: 2, col: 0 },
    sellPrice: 45,
    stakeAmount: 90,
    initialStakeAmount: 90,
  },
  {
    id: 7,
    position: { row: 2, col: 1 },
    sellPrice: 55,
    stakeAmount: 110,
    initialStakeAmount: 110,
  },
  {
    id: 8,
    position: { row: 2, col: 2 },
    sellPrice: 50,
    stakeAmount: 100,
    initialStakeAmount: 100,
  },
];
