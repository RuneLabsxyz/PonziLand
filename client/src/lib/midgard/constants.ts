import type { BaseLand } from './types';

// Grid configuration
export const GRID_SIZE = 3; // 3x3

// Initial values
export const INITIAL_GARD_BALANCE = 1000;

// Time mechanics (per tick)
export const TICK_INTERVAL_MS = 1000; // 1 second per tick

// Stake decrease rate: 1% per tick
export const STAKE_DECREASE_RATE = 0.01;

// Factory mechanics (per tick)
export const FACTORY_MINT_RATE = 0.02; // Mints 2% of locked GARD per tick
export const FACTORY_BURN_RATE = 0.015; // Burns 1.5% of locked GARD per tick

// Challenge mechanics
export const CHALLENGE_BASE_COST = 10;
export const CHALLENGE_WIN_MULTIPLIER = 2; // Win back 2x the cost
export const CHALLENGE_SUPPLY_SHARE = 0.5; // Win 50% of factory's minted supply

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
