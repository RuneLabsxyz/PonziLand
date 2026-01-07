/**
 * Tutorial-specific logic for coin.svelte
 * Extracted to keep the main component focused on rendering.
 */

import { coordinatesToLocation } from '$lib/utils';

/**
 * Tutorial location constants
 */
export const TUTORIAL_COIN_CONFIG = {
  // Player's land location: 128 * 256 + 128 = 32896
  PLAYER_LAND_LOCATION: coordinatesToLocation({ x: 128, y: 128 }),
  // Neighbor land to nuke: x=129, y=128
  NEIGHBOR_LAND: { x: 129, y: 128 },
  // Animation timings
  NUKE_ANIMATION_DELAY_MS: 3000,
  STEP_ADVANCE_DELAY_MS: 500,
} as const;

/**
 * Get the neighbor land location for tutorial nuke animation
 */
export function getTutorialNeighborLocation(): number {
  return coordinatesToLocation(TUTORIAL_COIN_CONFIG.NEIGHBOR_LAND);
}

/**
 * Check if the coin should be visible during the tutorial claim step
 */
export function shouldShowTutorialCoin(
  tutorialEnabled: boolean,
  hasWaitClaimNuke: boolean,
  tileLocation: number,
): boolean {
  if (!tutorialEnabled || !hasWaitClaimNuke) {
    return false;
  }
  return tileLocation === TUTORIAL_COIN_CONFIG.PLAYER_LAND_LOCATION;
}

/**
 * Check if this is the tutorial claim step on the player's land
 */
export function isTutorialClaimTile(
  tutorialEnabled: boolean,
  hasWaitClaimNuke: boolean,
  tileLocation: number,
): boolean {
  return (
    tutorialEnabled &&
    hasWaitClaimNuke &&
    tileLocation === TUTORIAL_COIN_CONFIG.PLAYER_LAND_LOCATION
  );
}
