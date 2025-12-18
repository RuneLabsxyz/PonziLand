// Midgard POC Formulas
// Implementation of yellow paper economics

import {
  BURN_RATE,
  INFLATION_RAMP_DURATION,
  MAX_BONUS_FRACTION,
  CHALLENGE_COST_FRACTION,
  WIN_PAYOUT_MULTIPLIER,
} from './constants';

/**
 * Calculate burn obligation at time t
 * B(t) = r * a
 * @param elapsedSeconds - Time since factory creation (a = t - t0)
 * @returns Burn obligation in GARD
 */
export function calculateBurn(elapsedSeconds: number): number {
  return BURN_RATE * elapsedSeconds;
}

/**
 * Calculate inflation accrued at time t
 * I(t) = r * a * (1 + m * (1 - e^(-ac/A)))
 * @param elapsedSeconds - Time since factory creation
 * @returns Inflation accrued in GARD
 */
export function calculateInflation(elapsedSeconds: number): number {
  const a = elapsedSeconds;
  const ac = Math.min(a, INFLATION_RAMP_DURATION);
  const A = INFLATION_RAMP_DURATION;
  const m = MAX_BONUS_FRACTION;

  // Bonus factor: starts at 1, approaches 1 + m*0.632 as time -> A
  const bonusFactor = 1 + m * (1 - Math.exp(-ac / A));

  return BURN_RATE * a * bonusFactor;
}

/**
 * Calculate effective burn (after reductions from failed challenges)
 * Beff = B(t) - sum(burn reductions)
 * @param elapsedSeconds - Time since factory creation
 * @param burnReductions - Sum of beta * Ticket from all failed challenges
 * @returns Effective burn obligation in GARD
 */
export function calculateEffectiveBurn(
  elapsedSeconds: number,
  burnReductions: number,
): number {
  return Math.max(0, calculateBurn(elapsedSeconds) - burnReductions);
}

/**
 * Calculate available inflation (after payouts to winners)
 * I_available = I(t) - sum(payouts)
 * @param elapsedSeconds - Time since factory creation
 * @param inflationPaidOut - Sum of all payouts to winning challengers
 * @returns Available inflation in GARD
 */
export function calculateAvailableInflation(
  elapsedSeconds: number,
  inflationPaidOut: number,
): number {
  return Math.max(0, calculateInflation(elapsedSeconds) - inflationPaidOut);
}

/**
 * Calculate challenge ticket cost
 * Ticket = alpha * Beff
 * @param effectiveBurn - Current effective burn obligation
 * @returns Ticket cost in GARD
 */
export function calculateTicketCost(effectiveBurn: number): number {
  return CHALLENGE_COST_FRACTION * effectiveBurn;
}

/**
 * Check if challenge is allowed (liquidity constraint)
 * Challenge allowed iff: I_available >= gamma * Ticket
 * @param availableInflation - Current available inflation
 * @param ticketCost - Cost of challenge ticket
 * @returns Whether the challenge can proceed
 */
export function canChallenge(
  availableInflation: number,
  ticketCost: number,
): boolean {
  return availableInflation >= WIN_PAYOUT_MULTIPLIER * ticketCost;
}

/**
 * Calculate win reward
 * Reward = gamma * Ticket
 * @param ticketCost - Cost of challenge ticket
 * @returns Reward in GARD
 */
export function calculateWinReward(ticketCost: number): number {
  return WIN_PAYOUT_MULTIPLIER * ticketCost;
}

/**
 * Generate a random game score (0-100)
 * Simple EGS game simulation
 * @returns Random score between 0 and 100
 */
export function playGame(): number {
  return Math.floor(Math.random() * 101);
}

/**
 * Format time in seconds to human readable string
 * @param seconds - Time in seconds
 * @returns Formatted string like "3d 14h 22m"
 */
export function formatTime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);

  return parts.join(' ');
}
